import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { MatchingService } from './matching.service';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [TrackingModule],
  controllers: [BookingsController],
  providers: [BookingsService, MatchingService],
  exports: [BookingsService],
})
export class BookingsModule {}
