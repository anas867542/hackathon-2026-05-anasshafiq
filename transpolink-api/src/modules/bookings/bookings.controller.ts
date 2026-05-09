import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsDto } from './dto/list-bookings.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { AcceptBookingDto } from './dto/accept-booking.dto';

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  // ---- CRUD ----
  @Roles(UserRole.customer)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBookingDto) {
    return this.bookings.create(user.id, dto);
  }

  @Roles(UserRole.customer, UserRole.driver, UserRole.admin)
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListBookingsDto) {
    return this.bookings.list(user, query);
  }

  @Roles(UserRole.driver)
  @Get('available')
  getAvailable(@CurrentUser() user: AuthUser) {
    if (!user.driverId) throw new ForbiddenException('Driver profile required');
    return this.bookings.getAvailableForDriver(user.driverId);
  }

  @Roles(UserRole.customer, UserRole.driver, UserRole.admin)
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.findOne(user, id);
  }

  @Roles(UserRole.customer, UserRole.driver, UserRole.admin)
  @Get(':id/locations')
  getLocations(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.getLocations(user, id);
  }

  // ---- Lifecycle ----
  @Roles(UserRole.driver)
  @Patch(':id/accept')
  accept(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcceptBookingDto,
  ) {
    return this.bookings.accept(user, id, dto);
  }

  @Roles(UserRole.driver)
  @Patch(':id/arrive')
  arrive(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.arrive(user, id);
  }

  @Roles(UserRole.driver)
  @Patch(':id/start')
  start(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.start(user, id);
  }

  @Roles(UserRole.driver)
  @Patch(':id/complete')
  complete(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.complete(user, id);
  }

  @Roles(UserRole.customer, UserRole.admin)
  @Post(':id/resend')
  resend(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.resend(user, id);
  }

  @Roles(UserRole.customer, UserRole.driver, UserRole.admin)
  @Patch(':id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookings.cancel(user, id, dto);
  }
}
