import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';
import { UserRole } from '@prisma/client';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

export class RegisterDto {
  @IsEmail()
  email!: string;

  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'phone must be E.164' })
  phone!: string;

  @IsString()
  @MinLength(10)
  @Matches(PASSWORD_RULE, {
    message:
      'password must be at least 10 characters and include uppercase, lowercase, and a digit',
  })
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole = UserRole.customer;

  // Driver-only fields (optional at register; can be added via onboarding later)
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  licenseExpiry?: string;
}
