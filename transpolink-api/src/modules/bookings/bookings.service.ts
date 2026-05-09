import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Booking,
  BookingStatus,
  BookingType,
  Prisma,
  UserRole,
} from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsDto } from './dto/list-bookings.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { AcceptBookingDto } from './dto/accept-booking.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { MatchingService } from './matching.service';
import { TrackingGateway } from '../tracking/tracking.gateway';

const BASE_FARE = 200; // PKR
const PER_KM = 80;
const PER_MIN = 5;
const SEARCH_RADIUS_KM = 5;
const REQUEST_TTL_SECONDS = 300;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private prisma: PrismaService,
    private matching: MatchingService,
    private tracking: TrackingGateway,
  ) {}

  // ============================================================
  // 1. CREATE — also fans out to nearby drivers
  // ============================================================
  async create(customerId: string, dto: CreateBookingDto) {
    if (dto.bookingType === BookingType.scheduled && !dto.scheduledAt) {
      throw new BadRequestException('scheduledAt required for scheduled bookings');
    }

    const distanceKm = haversine(
      dto.pickup.lat, dto.pickup.lng,
      dto.dropoff.lat, dto.dropoff.lng,
    );
    const durationMinutes = Math.round(distanceKm * 2);
    const estimatedFare = Math.round(BASE_FARE + distanceKm * PER_KM + durationMinutes * PER_MIN);

    const booking = await this.prisma.booking.create({
      data: {
        referenceCode: `TPL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        customerId,
        vehicleType: dto.vehicleType,
        pickupAddress: dto.pickup.address,
        pickupLat: dto.pickup.lat,
        pickupLng: dto.pickup.lng,
        dropoffAddress: dto.dropoff.address,
        dropoffLat: dto.dropoff.lat,
        dropoffLng: dto.dropoff.lng,
        goodsDescription: dto.goodsDescription,
        estimatedWeightKg: dto.estimatedWeightKg,
        distanceKm: new Prisma.Decimal(distanceKm.toFixed(2)),
        durationMinutes,
        estimatedFare: new Prisma.Decimal(estimatedFare),
        bookingType: dto.bookingType ?? BookingType.instant,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        status: BookingStatus.pending,
      },
      include: { customer: { select: { fullName: true } } },
    });

    // Fire-and-forget — don't block the HTTP response on a slow geo query.
    this.dispatchToNearbyDrivers(booking, booking.customer.fullName).catch((e) =>
      this.logger.error(`Dispatch failed for ${booking.id}`, e),
    );

    return booking;
  }

  private async dispatchToNearbyDrivers(
    booking: Booking,
    customerName: string,
    scheduleRedispatch = true,
  ) {
    if (booking.bookingType === BookingType.scheduled) return; // dispatch later via cron

    const candidates = await this.matching.findCandidates(
      Number(booking.pickupLat),
      Number(booking.pickupLng),
      booking.vehicleType,
      SEARCH_RADIUS_KM,
    );

    if (candidates.length === 0) {
      this.logger.warn(`No drivers found near booking ${booking.referenceCode}`);
      this.tracking.notifyUser(booking.customerId, 'booking:no_drivers', {
        bookingId: booking.id,
        message: 'No drivers available nearby. Try increasing the radius.',
      });
      return;
    }

    const payload = {
      bookingId: booking.id,
      referenceCode: booking.referenceCode,
      bookingType: booking.bookingType,
      vehicleType: booking.vehicleType,
      pickup: {
        address: booking.pickupAddress,
        lat: Number(booking.pickupLat),
        lng: Number(booking.pickupLng),
      },
      dropoff: {
        address: booking.dropoffAddress,
        lat: Number(booking.dropoffLat),
        lng: Number(booking.dropoffLng),
      },
      distanceKm: Number(booking.distanceKm ?? 0),
      durationMinutes: booking.durationMinutes,
      estimatedFare: Number(booking.estimatedFare ?? 0),
      goodsDescription: booking.goodsDescription,
      estimatedWeightKg: booking.estimatedWeightKg,
      customerName,
      expiresAt: new Date(Date.now() + REQUEST_TTL_SECONDS * 1000).toISOString(),
    };

    this.tracking.notifyDrivers(
      candidates.map((c) => c.driverId),
      'booking:new_request',
      payload,
    );

    this.logger.log(
      `Booking ${booking.referenceCode} dispatched to ${candidates.length} drivers`,
    );

    // Auto re-dispatch once if no driver accepts within the TTL window
    if (scheduleRedispatch) {
      setTimeout(
        () =>
          this.redispatchIfStillPending(booking.id).catch((e) =>
            this.logger.error(`Re-dispatch failed for ${booking.referenceCode}`, e),
          ),
        REQUEST_TTL_SECONDS * 1000,
      );
    }
  }

  private async redispatchIfStillPending(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: { select: { fullName: true } } },
    });
    if (!booking || booking.status !== BookingStatus.pending) return;

    // Bump updatedAt so getAvailableForDriver REST poll picks up a fresh TTL window
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { updatedAt: new Date() },
    });

    this.logger.log(`Re-dispatching ${booking.referenceCode} — no acceptance within TTL`);
    this.tracking.notifyUser(booking.customerId, 'booking:searching', {
      bookingId,
      message: 'Still searching for a driver near you…',
    });

    // scheduleRedispatch=false prevents infinite loops
    await this.dispatchToNearbyDrivers(booking, booking.customer.fullName, false);
  }

  // ============================================================
  // AVAILABLE — driver polling fallback
  // ============================================================
  async getAvailableForDriver(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { trucks: { where: { isActive: true } } },
    });
    if (!driver) {
      this.logger.warn(`getAvailableForDriver: driver ${driverId} not found`);
      return [];
    }
    if (driver.currentLat == null || driver.currentLng == null) {
      this.logger.warn(`getAvailableForDriver: driver ${driverId} has no location (status=${driver.status})`);
      return [];
    }

    const truckTypes = driver.trucks.map((t) => t.type);
    if (truckTypes.length === 0) {
      this.logger.warn(`getAvailableForDriver: driver ${driverId} has no active trucks`);
      return [];
    }

    // Only return bookings with at least 60 s of TTL remaining.
    // Filter on updatedAt (not createdAt) so re-dispatched bookings get a fresh window.
    const since = new Date(Date.now() - (REQUEST_TTL_SECONDS - 60) * 1000);

    // DIAGNOSTIC: list ALL pending non-scheduled bookings unfiltered, so we can see
    // exactly which filter is dropping them.
    const allPending = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.pending,
        bookingType: { not: BookingType.scheduled },
      },
      select: {
        id: true,
        referenceCode: true,
        vehicleType: true,
        updatedAt: true,
        pickupLat: true,
        pickupLng: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.pending,
        bookingType: { not: BookingType.scheduled },
        vehicleType: { in: truckTypes },
        updatedAt: { gte: since },
      },
      include: { customer: { select: { fullName: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    const dLat = Number(driver.currentLat);
    const dLng = Number(driver.currentLng);

    const withinRange = bookings.filter(
      (b) => haversine(dLat, dLng, Number(b.pickupLat), Number(b.pickupLng)) <= SEARCH_RADIUS_KM,
    );

    // Log every call so we can see the deltas in production
    this.logger.log(
      `getAvailable[${driverId.slice(0, 8)}]: ` +
        `allPending=${allPending.length} typeFiltered=${bookings.length} withinRange=${withinRange.length} | ` +
        `driverAt=(${dLat.toFixed(4)},${dLng.toFixed(4)}) trucks=[${truckTypes.join(',')}] | ` +
        `since=${since.toISOString()} now=${new Date().toISOString()} | ` +
        `pending=${JSON.stringify(allPending.map((b) => ({
          ref: b.referenceCode,
          type: b.vehicleType,
          updated: b.updatedAt.toISOString(),
          km: haversine(dLat, dLng, Number(b.pickupLat), Number(b.pickupLng)).toFixed(2),
        })))}`,
    );

    return withinRange.map((b) => ({
        bookingId: b.id,
        referenceCode: b.referenceCode,
        bookingType: b.bookingType,
        vehicleType: b.vehicleType,
        pickup: { address: b.pickupAddress, lat: Number(b.pickupLat), lng: Number(b.pickupLng) },
        dropoff: { address: b.dropoffAddress, lat: Number(b.dropoffLat), lng: Number(b.dropoffLng) },
        distanceKm: Number(b.distanceKm ?? 0),
        durationMinutes: b.durationMinutes,
        estimatedFare: Number(b.estimatedFare ?? 0),
        goodsDescription: b.goodsDescription ?? null,
        estimatedWeightKg: b.estimatedWeightKg ?? null,
        customerName: b.customer.fullName,
        // expiresAt based on updatedAt so re-dispatched bookings show a fresh countdown
        expiresAt: new Date(b.updatedAt.getTime() + REQUEST_TTL_SECONDS * 1000).toISOString(),
      }));
  }

  // ============================================================
  // READ
  // ============================================================
  async list(actor: AuthUser, query: ListBookingsDto) {
    const where: Prisma.BookingWhereInput = { ...(query.status && { status: query.status }) };
    if (actor.role === UserRole.customer) where.customerId = actor.id;
    else if (actor.role === UserRole.driver) where.driverId = actor.driverId ?? '__none__';

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.booking.count({ where }),
    ]);
    return { items, page, pageSize, total };
  }

  async findOne(actor: AuthUser, id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        driver: {
          include: {
            user: { select: { fullName: true, phone: true, avatarUrl: true } },
            trucks: { where: { isActive: true }, take: 1 },
          },
        },
        truck: true,
        payment: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    this.assertCanView(actor, booking);
    return booking;
  }

  // ============================================================
  // 3. ACCEPT — atomic, first driver wins
  // ============================================================
  async accept(actor: AuthUser, id: string, dto: AcceptBookingDto) {
    if (actor.role !== UserRole.driver || !actor.driverId) {
      throw new ForbiddenException('Only drivers can accept bookings');
    }

    // Bidding bookings can't be one-tap accepted; the driver must POST a bid.
    const meta = await this.prisma.booking.findUnique({
      where: { id },
      select: { bookingType: true, vehicleType: true },
    });
    if (!meta) throw new NotFoundException('Booking not found');
    if (meta.bookingType === BookingType.bidding) {
      throw new BadRequestException(
        'Booking is open for bidding. Submit a bid via POST /bookings/:id/bids',
      );
    }

    let resolvedTruckId: string | undefined;
    if (dto.truckId) {
      const truck = await this.prisma.truck.findUnique({
        where: { id: dto.truckId },
        select: { driverId: true, isActive: true, type: true },
      });
      if (!truck || truck.driverId !== actor.driverId || !truck.isActive) {
        throw new ForbiddenException('Truck not available for this driver');
      }
      if (truck.type !== meta.vehicleType) {
        throw new BadRequestException(
          `Truck type ${truck.type} does not match booking requirement ${meta.vehicleType}`,
        );
      }
      resolvedTruckId = dto.truckId;
    } else {
      // Auto-resolve: driver must have an active truck matching the booking's vehicle type
      const truck = await this.prisma.truck.findFirst({
        where: { driverId: actor.driverId, type: meta.vehicleType, isActive: true },
        orderBy: { isPrimary: 'desc' },
      });
      if (!truck) {
        throw new ForbiddenException(
          `No active ${meta.vehicleType} truck registered. Add one before accepting.`,
        );
      }
      resolvedTruckId = truck.id;
    }

    const now = new Date();

    // CAS-style update: only succeeds if booking is still pending AND unassigned
    const result = await this.prisma.booking.updateMany({
      where: { id, status: BookingStatus.pending, driverId: null },
      data: {
        driverId: actor.driverId,
        truckId: resolvedTruckId,
        status: BookingStatus.accepted,
        matchedAt: now,
        acceptedAt: now,
      },
    });

    if (result.count === 0) {
      const exists = await this.prisma.booking.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!exists) throw new NotFoundException('Booking not found');
      throw new ConflictException(`Booking is no longer available (status: ${exists.status})`);
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        driver: { include: { user: { select: { fullName: true, phone: true, avatarUrl: true } } } },
        truck: { select: { plateNumber: true, type: true, model: true } },
      },
    });

    // Mark driver as on_trip so they stop receiving new booking requests
    await this.prisma.driver.update({
      where: { id: actor.driverId },
      data: { status: 'on_trip' },
    });

    // Notify customer + booking room
    this.tracking.notifyUser(booking!.customerId, 'booking:matched', {
      bookingId: booking!.id,
      driver: {
        id: booking!.driverId,
        fullName: booking!.driver?.user.fullName,
        phone: booking!.driver?.user.phone,
        avatarUrl: booking!.driver?.user.avatarUrl,
        rating: Number(booking!.driver?.ratingAvg ?? 0),
      },
      truck: booking!.truck,
      acceptedAt: booking!.acceptedAt,
    });

    this.tracking.emitBookingStatus(booking!.id, BookingStatus.accepted);
    return booking;
  }

  // ============================================================
  // 4. LIFECYCLE TRANSITIONS
  // ============================================================
  arrive(actor: AuthUser, id: string) {
    return this.driverTransition(actor, id, BookingStatus.arrived, { arrivedAt: new Date() });
  }

  start(actor: AuthUser, id: string) {
    return this.driverTransition(actor, id, BookingStatus.in_progress, { startedAt: new Date() });
  }

  async complete(actor: AuthUser, id: string) {
    if (actor.role !== UserRole.driver || !actor.driverId) {
      throw new ForbiddenException('Driver only');
    }

    const booking = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Booking not found');
      if (existing.driverId !== actor.driverId) throw new ForbiddenException('Not your booking');
      this.assertTransition(existing.status, BookingStatus.completed);

      const updated = await tx.booking.update({
        where: { id },
        data: { status: BookingStatus.completed, completedAt: new Date() },
      });

      // Increment driver trip count and earnings, and reset status — all in one atomic write
      const fare = Number(updated.finalFare ?? updated.estimatedFare ?? 0);
      await tx.driver.update({
        where: { id: actor.driverId! },
        data: {
          totalTrips: { increment: 1 },
          totalEarnings: { increment: new Prisma.Decimal(fare.toFixed(2)) },
          status: 'online',
        },
      });

      return updated;
    });

    this.tracking.emitBookingStatus(id, BookingStatus.completed);
    return booking;
  }

  async cancel(actor: AuthUser, id: string, dto: CancelBookingDto) {
    const booking = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Booking not found');
      this.assertCanCancel(actor, existing);
      this.assertTransition(existing.status, BookingStatus.cancelled);

      // CAS-style: only update if status hasn't changed since we read it.
      // Guards against cancel racing with an accept that won the row first.
      const result = await tx.booking.updateMany({
        where: { id, status: existing.status },
        data: {
          status: BookingStatus.cancelled,
          cancelledAt: new Date(),
          cancellationReason: dto.reason,
        },
      });

      if (result.count === 0) {
        throw new ConflictException(
          'Booking status changed concurrently — please refresh and try again',
        );
      }

      return tx.booking.findUnique({ where: { id } });
    });

    // If a driver was assigned, put them back online
    if (booking?.driverId) {
      await this.prisma.driver.update({
        where: { id: booking.driverId },
        data: { status: 'online' },
      });
    }

    this.tracking.emitBookingStatus(id, BookingStatus.cancelled, {
      cancelledBy: actor.role,
      reason: dto.reason,
    });
    return booking;
  }

  // ============================================================
  // GPS TRAIL
  // ============================================================
  async getLocations(actor: AuthUser, id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      select: { customerId: true, driverId: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    this.assertCanView(actor, booking as Booking);

    const locations = await this.prisma.tripLocation.findMany({
      where: { bookingId: id },
      orderBy: { recordedAt: 'asc' },
      select: { lat: true, lng: true, speedKmh: true, heading: true, recordedAt: true },
    });

    return locations.map((l) => ({
      lat: Number(l.lat),
      lng: Number(l.lng),
      speedKmh: l.speedKmh,
      heading: l.heading,
      recordedAt: l.recordedAt,
    }));
  }

  // ============================================================
  // helpers
  // ============================================================
  private async driverTransition(
    actor: AuthUser,
    id: string,
    next: BookingStatus,
    extra: Prisma.BookingUpdateInput,
  ) {
    if (actor.role !== UserRole.driver || !actor.driverId) {
      throw new ForbiddenException('Driver only');
    }

    const booking = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Booking not found');
      if (existing.driverId !== actor.driverId) throw new ForbiddenException('Not your booking');
      this.assertTransition(existing.status, next);
      return tx.booking.update({ where: { id }, data: { status: next, ...extra } });
    });

    this.tracking.emitBookingStatus(id, next);
    return booking;
  }

  private assertCanView(actor: AuthUser, booking: Booking) {
    if (actor.role === UserRole.admin) return;
    if (actor.role === UserRole.customer && booking.customerId === actor.id) return;
    if (actor.role === UserRole.driver && booking.driverId === actor.driverId) return;
    throw new ForbiddenException('Cannot access this booking');
  }

  private assertCanCancel(actor: AuthUser, booking: Booking) {
    if (actor.role === UserRole.admin) return;
    if (actor.role === UserRole.customer && booking.customerId === actor.id) return;
    if (actor.role === UserRole.driver && booking.driverId === actor.driverId) return;
    throw new ForbiddenException('Cannot cancel this booking');
  }

  private assertTransition(current: BookingStatus, next: BookingStatus) {
    const allowed: Record<BookingStatus, BookingStatus[]> = {
      pending:     [BookingStatus.matched, BookingStatus.accepted, BookingStatus.cancelled, BookingStatus.expired],
      matched:     [BookingStatus.accepted, BookingStatus.cancelled, BookingStatus.expired],
      accepted:    [BookingStatus.arrived, BookingStatus.cancelled],
      arrived:     [BookingStatus.in_progress, BookingStatus.cancelled],
      in_progress: [BookingStatus.completed, BookingStatus.cancelled],
      completed:   [],
      cancelled:   [],
      expired:     [],
    };
    if (!allowed[current].includes(next)) {
      throw new BadRequestException(`Illegal transition: ${current} → ${next}`);
    }
  }
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
