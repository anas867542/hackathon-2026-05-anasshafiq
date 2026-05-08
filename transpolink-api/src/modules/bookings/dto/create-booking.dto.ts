import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { BookingType, VehicleType } from '@prisma/client';

class GeoPoint {
  @IsString()
  @MaxLength(500)
  address!: string;

  @Type(() => Number)
  @IsLatitude()
  lat!: number;

  @Type(() => Number)
  @IsLongitude()
  lng!: number;
}

export class CreateBookingDto {
  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @ValidateNested()
  @Type(() => GeoPoint)
  pickup!: GeoPoint;

  @ValidateNested()
  @Type(() => GeoPoint)
  dropoff!: GeoPoint;

  @IsOptional() @IsString() @MaxLength(1000) goodsDescription?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  estimatedWeightKg?: number;

  @IsOptional()
  @IsEnum(BookingType)
  bookingType?: BookingType = BookingType.instant;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
