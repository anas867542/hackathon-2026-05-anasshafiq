import { IsOptional, IsUUID } from 'class-validator';

export class AcceptBookingDto {
  @IsOptional()
  @IsUUID()
  truckId?: string;
}
