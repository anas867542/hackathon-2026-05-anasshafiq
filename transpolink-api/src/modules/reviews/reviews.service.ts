import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(reviewer: AuthUser, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      select: { id: true, status: true, customerId: true, driverId: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== 'completed') {
      throw new BadRequestException('You can only review a completed booking');
    }

    const isCustomer = booking.customerId === reviewer.id;
    const driverProfile = booking.driverId
      ? await this.prisma.driver.findUnique({
          where: { id: booking.driverId },
          select: { id: true, userId: true },
        })
      : null;

    const isDriver = !!driverProfile && driverProfile.userId === reviewer.id;
    if (!isCustomer && !isDriver) {
      throw new ForbiddenException('You are not a participant of this booking');
    }

    // Customer reviews driver; driver reviews customer
    const revieweeId = isCustomer ? driverProfile!.userId : booking.customerId;

    try {
      const review = await this.prisma.$transaction(async (tx) => {
        const created = await tx.review.create({
          data: {
            bookingId: dto.bookingId,
            reviewerId: reviewer.id,
            revieweeId,
            score: dto.score,
            comment: dto.comment,
          },
        });

        // Keep driver's aggregate rating up-to-date when they are the reviewee
        if (isCustomer && driverProfile) {
          const agg = await tx.review.aggregate({
            where: { revieweeId, isHidden: false },
            _avg: { score: true },
            _count: { score: true },
          });
          await tx.driver.update({
            where: { id: driverProfile.id },
            data: {
              ratingAvg: new Prisma.Decimal((agg._avg.score ?? dto.score).toFixed(2)),
              ratingCount: agg._count.score,
            },
          });
        }

        return created;
      });

      return review;
    } catch (err: unknown) {
      // Unique constraint violation → already reviewed
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new BadRequestException('You have already reviewed this booking');
      }
      throw err;
    }
  }

  /** Fetch reviews written about a user (their received reviews). */
  async listForUser(userId: string, take = 20, skip = 0) {
    return this.prisma.review.findMany({
      where: { revieweeId: userId, isHidden: false },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      select: {
        id: true,
        score: true,
        comment: true,
        createdAt: true,
        reviewer: { select: { fullName: true, avatarUrl: true } },
      },
    });
  }

  /** Check whether the current user already reviewed a booking. */
  async hasReviewed(reviewerId: string, bookingId: string): Promise<boolean> {
    const count = await this.prisma.review.count({
      where: { reviewerId, bookingId },
    });
    return count > 0;
  }
}
