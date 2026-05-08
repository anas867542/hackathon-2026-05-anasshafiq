import { IsEnum, IsLatitude, IsLongitude, IsOptional } from 'class-validator';
import { DriverStatus } from '@prisma/client';

export class UpdateAvailabilityDto {
  @IsEnum(DriverStatus)
  status!: DriverStatus;

  @IsOptional()
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @IsLongitude()
  lng?: number;
}
