import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SubmitBidDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(9_999_999)
  amount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(240)
  etaMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  message?: string;

  /** Auto-expire window in seconds; defaults to 5 minutes. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(900)
  expiresInSeconds?: number;
}
