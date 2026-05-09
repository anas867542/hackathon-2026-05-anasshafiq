import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { DriversService } from './drivers.service';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { FindNearbyDto } from './dto/find-nearby.dto';
import { DriverOnboardingDto } from './dto/onboarding.dto';

@ApiTags('drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Roles(UserRole.admin)
  @Get()
  listAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize: number,
  ) {
    return this.drivers.listAll(page, pageSize);
  }

  @Roles(UserRole.driver)
  @Patch('me/onboarding')
  submitOnboarding(@CurrentUser() user: AuthUser, @Body() dto: DriverOnboardingDto) {
    return this.drivers.submitOnboarding(user.id, dto);
  }

  @Roles(UserRole.driver)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    if (!user.driverId) throw new ForbiddenException('Driver profile not set up');
    return this.drivers.getMe(user.driverId);
  }

  @Roles(UserRole.driver)
  @Patch('me/availability')
  setAvailability(@CurrentUser() user: AuthUser, @Body() dto: UpdateAvailabilityDto) {
    if (!user.driverId) throw new ForbiddenException('Driver profile not set up');
    return this.drivers.setAvailability(user.id, user.driverId, dto);
  }

  @Roles(UserRole.driver)
  @Patch('me/location')
  updateLocation(@CurrentUser() user: AuthUser, @Body() dto: UpdateLocationDto) {
    if (!user.driverId) throw new ForbiddenException('Driver profile not set up');
    return this.drivers.updateLocation(user.driverId, dto);
  }

  @Roles(UserRole.customer, UserRole.admin)
  @Get('nearby')
  nearby(@Query() dto: FindNearbyDto) {
    return this.drivers.findNearby(dto);
  }
}
