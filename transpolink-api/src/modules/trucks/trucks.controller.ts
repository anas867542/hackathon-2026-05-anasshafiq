import {
  Body,
  Controller,
  Delete,
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
import { TrucksService } from './trucks.service';
import { CreateTruckDto } from './dto/create-truck.dto';
import { UpdateTruckDto } from './dto/update-truck.dto';

@ApiTags('trucks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('trucks')
export class TrucksController {
  constructor(private readonly trucks: TrucksService) {}

  @Roles(UserRole.driver)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTruckDto) {
    if (!user.driverId) throw new ForbiddenException('Driver profile required');
    return this.trucks.create(user.driverId, dto);
  }

  @Roles(UserRole.driver, UserRole.admin)
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('driverId') driverId?: string) {
    return this.trucks.findAll(user, driverId);
  }

  @Roles(UserRole.driver, UserRole.admin)
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.trucks.findOne(user, id);
  }

  @Roles(UserRole.driver, UserRole.admin)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTruckDto,
  ) {
    return this.trucks.update(user, id, dto);
  }

  @Roles(UserRole.driver, UserRole.admin)
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.trucks.remove(user, id);
  }
}
