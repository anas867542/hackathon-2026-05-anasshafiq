import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BidStatus, BookingStatus, BookingType, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { SubmitBidDto } from './dto/submit-bid.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';

const DEFAULT_EXPIRY_SECONDS = 5 * 60;

@Injectable()
export class BiddingService {
  private readonly logger = new Logger(BiddingService.name);

  constructor(
    private prisma: PrismaService,
    private tracking: TrackingGateway,
  ) {}

  // ============================================================
  // Driver submits / updates a bid
  // ============================================================
  async submit(driverId: string, bookingId: string, dto: SubmitBidDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        customerId: true,
        status: true,
        bookingType: true,
        vehicleType: true,
        estimatedFare: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.bookingType !== BookingType.bidding) {
      throw new BadRequestException('Booking is not open for bidding');
    }
    if (booking.status !== BookingStatus.pending) {
      throw new ConflictException(`Booking is no longer accepting bids (${booking.status})`);
    }

    // Reject bids more than 10× the system estimate to prevent abuse
    if (booking.estimatedFare) {
      const ceiling = Number(booking.estimatedFare) * 10;
      if (dto.amount > ceiling) {
        throw new BadRequestException(
          `Bid amount exceeds maximum allowed (${Math.round(ceiling)})`,
        );
      }
    }

    // Driver must own a matching active truck
    const truck = await this.prisma.truck.findFirst({
      where: { driverId, type: booking.vehicleType, isActive: true },
    });
    if (!truck) {
      throw new ForbiddenException('No active truck of the required type registered');
    }

    const expiresAt = new Date(
      Date.now() + (dto.expiresInSeconds ?? DEFAULT_EXPIRY_SECONDS) * 1000,
    );

    const bid = await this.prisma.bid.upsert({
      where: { bookingId_driverId: { bookingId, driverId } },
      create: {
        bookingId,
        driverId,
        amount: new Prisma.Decimal(dto.amount),
        etaMinutes: dto.etaMinutes,
        message: dto.message,
        expiresAt,
        status: BidStatus.pending,
      },
      update: {
        amount: new Prisma.Decimal(dto.amount),
        etaMinutes: dto.etaMinutes,
        message: dto.message,
        expiresAt,
        status: BidStatus.pending,
      },
      include: this.bidInclude(),
    });

    // Notify customer in real time
    this.tracking.notifyUser(booking.customerId, 'booking:bid_received', {
      bookingId,
      bid: this.serialize(bid),
    });

    return this.serialize(bid);
  }

  // ============================================================
  // Customer lists bids
  // ============================================================
  async listForBooking(actor: AuthUser, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { customerId: true, bookingType: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (actor.role !== UserRole.admin && actor.id !== booking.customerId) {
      throw new ForbiddenException('Cannot view bids for this booking');
    }

    const now = new Date();
    const bids = await this.prisma.bid.findMany({
      where: {
        bookingId,
        status: BidStatus.pending,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { amount: 'asc' },
      include: this.bidInclude(),
    });

    return bids.map((b) => this.serialize(b));
  }

  // ============================================================
  // Customer accepts a bid → assigns driver, rejects others
  // ============================================================
  async accept(actor: AuthUser, bookingId: string, bidId: string) {
    if (actor.role !== UserRole.customer) {
      throw new ForbiddenException('Only customers can accept bids');
    }

    // Do all DB work atomically; only emit WS events after commit.
    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.customerId !== actor.id) throw new ForbiddenException('Not your booking');
      if (booking.bookingType !== BookingType.bidding) {
        throw new BadRequestException('Not a bidding booking');
      }
      if (booking.status !== BookingStatus.pending) {
        throw new ConflictException(`Booking already ${booking.status}`);
      }

      const bid = await tx.bid.findUnique({ where: { id: bidId } });
      if (!bid) throw new NotFoundException('Bid not found');
      if (bid.bookingId !== bookingId) {
        throw new BadRequestException('Bid does not belong to this booking');
      }
      if (bid.status !== BidStatus.pending) {
        throw new ConflictException(`Bid is no longer available (${bid.status})`);
      }
      if (bid.expiresAt && bid.expiresAt < new Date()) {
        throw new ConflictException('Bid has expired');
      }

      const truck = await tx.truck.findFirst({
        where: { driverId: bid.driverId, type: booking.vehicleType, isActive: true },
        orderBy: { isPrimary: 'desc' },
      });

      const now = new Date();

      // Accept this bid, reject the rest, assign driver to booking
      await tx.bid.update({
        where: { id: bidId },
        data: { status: BidStatus.accepted },
      });
      await tx.bid.updateMany({
        where: { bookingId, id: { not: bidId }, status: BidStatus.pending },
        data: { status: BidStatus.rejected },
      });

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          driverId: bid.driverId,
          truckId: truck?.id,
          status: BookingStatus.accepted,
          finalFare: bid.amount,
          matchedAt: now,
          acceptedAt: now,
        },
        include: {
          driver: {
            include: {
              user: { select: { fullName: true, phone: true, avatarUrl: true } },
            },
          },
          truck: true,
        },
      });

      const losers = await tx.bid.findMany({
        where: { bookingId, status: BidStatus.rejected },
        select: { driverId: true },
      });

      return {
        updated,
        winnerDriverId: bid.driverId,
        winnerAmount: Number(bid.amount),
        loserDriverIds: losers.map((l) => l.driverId),
      };
    });

    // Mark winning driver as on_trip so they stop receiving new booking requests
    await this.prisma.driver.update({
      where: { id: result.winnerDriverId },
      data: { status: 'on_trip' },
    });

    // Side effects after commit
    this.tracking.emitBookingStatus(bookingId, BookingStatus.accepted);
    this.tracking.notifyDriver(result.winnerDriverId, 'booking:bid_accepted', {
      bookingId,
      bidId,
      amount: result.winnerAmount,
    });
    if (result.loserDriverIds.length > 0) {
      for (const id of result.loserDriverIds) {
        this.tracking.notifyDriver(id, 'booking:bid_rejected', { bookingId });
      }
    }

    // Notify the customer of the match (matches /accept flow)
    this.tracking.notifyUser(actor.id, 'booking:matched', {
      bookingId,
      driver: {
        id: result.updated.driverId,
        fullName: result.updated.driver?.user.fullName,
        phone: result.updated.driver?.user.phone,
        avatarUrl: result.updated.driver?.user.avatarUrl,
        rating: Number(result.updated.driver?.ratingAvg ?? 0),
      },
      truck: result.updated.truck && {
        plateNumber: result.updated.truck.plateNumber,
        type: result.updated.truck.type,
        model: result.updated.truck.model,
      },
      acceptedAt: result.updated.acceptedAt,
    });

    return result.updated;
  }

  // ============================================================
  // Driver withdraws a bid
  // ============================================================
  async withdraw(actor: AuthUser, bookingId: string, bidId: string) {
    if (actor.role !== UserRole.driver || !actor.driverId) {
      throw new ForbiddenException('Driver only');
    }
    const bid = await this.prisma.bid.findUnique({ where: { id: bidId } });
    if (!bid) throw new NotFoundException('Bid not found');
    if (bid.bookingId !== bookingId) {
      throw new BadRequestException('Bid does not belong to this booking');
    }
    if (bid.driverId !== actor.driverId) throw new ForbiddenException('Not your bid');
    if (bid.status !== BidStatus.pending) {
      throw new ConflictException(`Cannot withdraw — bid is ${bid.status}`);
    }

    const updated = await this.prisma.bid.update({
      where: { id: bidId },
      data: { status: BidStatus.withdrawn },
    });

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { customerId: true },
    });
    if (booking) {
      this.tracking.notifyUser(booking.customerId, 'booking:bid_withdrawn', {
        bookingId,
        bidId,
      });
    }
    return updated;
  }

  // ============================================================
  // Helpers
  // ============================================================
  private bidInclude() {
    return {
      driver: {
        include: {
          user: { select: { fullName: true, avatarUrl: true } },
          trucks: {
            where: { isActive: true },
            take: 1,
            select: { plateNumber: true, type: true, model: true },
          },
        },
      },
    } satisfies Prisma.BidInclude;
  }

  private serialize(bid: Prisma.BidGetPayload<{ include: ReturnType<BiddingService['bidInclude']> }>) {
    return {
      id: bid.id,
      bookingId: bid.bookingId,
      driverId: bid.driverId,
      amount: Number(bid.amount),
      etaMinutes: bid.etaMinutes,
      message: bid.message,
      status: bid.status,
      expiresAt: bid.expiresAt,
      createdAt: bid.createdAt,
      driver: {
        id: bid.driverId,
        fullName: bid.driver.user.fullName,
        avatarUrl: bid.driver.user.avatarUrl,
        ratingAvg: Number(bid.driver.ratingAvg),
        totalTrips: bid.driver.totalTrips,
        truck: bid.driver.trucks[0] ?? null,
      },
    };
  }
}
