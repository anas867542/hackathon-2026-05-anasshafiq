import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { VehicleType } from '@prisma/client';

export class CreateTruckDto {
  @IsEnum(VehicleType)
  type!: VehicleType;

  @IsString()
  @Length(3, 20)
  plateNumber!: string;

  @IsInt()
  @Min(50)
  capacityKg!: number;

  @IsOptional()
  @IsNumber()
  capacityVolumeM3?: number;

  @IsOptional() @IsString() make?: string;
  @IsOptional() @IsString() model?: string;

  @IsOptional()
  @IsInt()
  @Min(1980)
  @Max(2100)
  year?: number;

  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() registrationDocUrl?: string;
  @IsOptional() @IsString() insuranceDocUrl?: string;
  @IsOptional() @IsString() insuranceExpiry?: string;

  @IsOptional() @IsBoolean() isPrimary?: boolean;
}
