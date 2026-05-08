import { PartialType } from '@nestjs/swagger';
import { CreateTruckDto } from './create-truck.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateTruckDto extends PartialType(CreateTruckDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
