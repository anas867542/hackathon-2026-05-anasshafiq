import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { validateEnv } from './common/config/env.validation';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { TrucksModule } from './modules/trucks/trucks.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { BiddingModule } from './modules/bidding/bidding.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { HealthModule } from './health/health.module';

const THROTTLE_LIMIT =
  process.env.NODE_ENV === 'test'
    ? 1_000_000
    : parseInt(process.env.THROTTLE_LIMIT ?? '100', 10);

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10) * 1000,
        limit: THROTTLE_LIMIT,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    DriversModule,
    TrucksModule,
    BookingsModule,
    BiddingModule,
    TrackingModule,
    ReviewsModule,
    HealthModule,
  ],
  providers:
    process.env.NODE_ENV === 'test'
      ? []
      : [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
