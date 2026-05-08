import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class DriverOnboardingDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  licenseNumber!: string;

  @IsDateString()
  licenseExpiry!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  cnicNumber?: string;

  @IsOptional()
  @IsString()
  licenseDocUrl?: string;
}
