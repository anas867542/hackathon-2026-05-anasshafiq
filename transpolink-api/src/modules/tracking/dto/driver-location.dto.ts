import { IsLatitude, IsLongitude, IsOptional, IsNumber, IsUUID, Max, Min } from 'class-validator';

export class DriverLocationDto {
  @IsUUID()
  bookingId!: string;

  @IsLatitude()
  lat!: number;

  @IsLongitude()
  lng!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(250)
  speedKmh?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;
}
