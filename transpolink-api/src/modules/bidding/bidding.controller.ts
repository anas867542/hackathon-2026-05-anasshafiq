import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { BiddingService } from './bidding.service';
import { SubmitBidDto } from './dto/submit-bid.dto';

@ApiTags('bidding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings/:bookingId/bids')
export class BiddingController {
  constructor(private readonly bidding: BiddingService) {}

  @Roles(UserRole.driver)
  @Post()
  submit(
    @CurrentUser() user: AuthUser,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() dto: SubmitBidDto,
  ) {
    if (!user.driverId) throw new ForbiddenException('Driver profile required');
    return this.bidding.submit(user.driverId, bookingId, dto);
  }

  @Roles(UserRole.customer, UserRole.admin)
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
  ) {
    return this.bidding.listForBooking(user, bookingId);
  }

  @Roles(UserRole.customer)
  @Patch(':bidId/accept')
  accept(
    @CurrentUser() user: AuthUser,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Param('bidId', ParseUUIDPipe) bidId: string,
  ) {
    return this.bidding.accept(user, bookingId, bidId);
  }

  @Roles(UserRole.driver)
  @Patch(':bidId/withdraw')
  withdraw(
    @CurrentUser() user: AuthUser,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Param('bidId', ParseUUIDPipe) bidId: string,
  ) {
    return this.bidding.withdraw(user, bookingId, bidId);
  }
}
