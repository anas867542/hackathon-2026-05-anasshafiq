import { Type } from 'class-transformer';
import { IsEnum, IsLatitude, IsLongitude, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { VehicleType } from '@prisma/client';

export class FindNearbyDto {
  @Type(() => Number)
  @IsLatitude()
  lat!: number;

  @Type(() => Number)
  @IsLongitude()
  lng!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(50)
  @IsOptional()
  radiusKm?: number = 5;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;
}
