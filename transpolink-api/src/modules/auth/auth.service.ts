import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

/** bcrypt hash of "dummy-password" at rounds=12 — used for constant-time comparison when email not found */
const DUMMY_HASH = '$2b$12$KIXeUuotzHuRlSo1LnWLs.WqiGKyXfL.IcxL4LpVGopnF2lhBuvvO';

interface LockoutRecord {
  count: number;
  lockedUntil: number;
}

@Injectable()
export class AuthService {
  private readonly failedLogins = new Map<string, LockoutRecord>();
  private static readonly MAX_FAILED = 5;
  private static readonly LOCKOUT_MS = 15 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
    });
    if (existing) throw new ConflictException('Email or phone already in use');

    const rounds = parseInt(this.config.get<string>('BCRYPT_ROUNDS', '12'), 10);
    const passwordHash = await bcrypt.hash(dto.password, rounds);
    const role = dto.role ?? UserRole.customer;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        fullName: dto.fullName,
        role,
        status: UserStatus.active,
        driver:
          role === UserRole.driver && dto.licenseNumber && dto.licenseExpiry
            ? {
                create: {
                  licenseNumber: dto.licenseNumber,
                  licenseExpiry: new Date(dto.licenseExpiry),
                },
              }
            : undefined,
      },
      include: { driver: { select: { id: true } } },
    });

    return this.issueTokens(user.id, user.email, user.role, user.driver?.id ?? null);
  }

  async login(dto: LoginDto) {
    const emailKey = dto.email.toLowerCase();

    // Lockout check
    const lockout = this.failedLogins.get(emailKey);
    if (lockout && Date.now() < lockout.lockedUntil) {
      throw new UnauthorizedException('Too many failed attempts — try again later');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { driver: { select: { id: true } } },
    });

    // Always run bcrypt to prevent timing-based email enumeration.
    // If user not found, compare against a dummy hash (same cost as real hash).
    const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
    const ok = await bcrypt.compare(dto.password, hashToCompare);

    const valid = user && user.status === UserStatus.active && ok;

    if (!valid) {
      // Track failure
      const rec = this.failedLogins.get(emailKey) ?? { count: 0, lockedUntil: 0 };
      rec.count += 1;
      if (rec.count >= AuthService.MAX_FAILED) {
        rec.lockedUntil = Date.now() + AuthService.LOCKOUT_MS;
        rec.count = 0;
      }
      this.failedLogins.set(emailKey, rec);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Clear failure counter on success
    this.failedLogins.delete(emailKey);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueTokens(user.id, user.email, user.role, user.driver?.id ?? null);
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: { include: { driver: { select: { id: true } } } },
      },
    });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // rotate
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(
      record.user.id,
      record.user.email,
      record.user.role,
      record.user.driver?.id ?? null,
    );
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: UserRole,
    driverId: string | null,
  ) {
    const payload = { sub: userId, email, role };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m'),
    });

    const refreshToken = crypto.randomBytes(48).toString('hex');
    const expiresAt = this.parseExpiry(this.config.get('JWT_REFRESH_EXPIRES', '7d'));

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: userId, email, role, driverId },
    };
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseExpiry(input: string): Date {
    const m = /^(\d+)([smhd])$/.exec(input);
    if (!m) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const n = parseInt(m[1], 10);
    const unit = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[m[2] as 's' | 'm' | 'h' | 'd'];
    return new Date(Date.now() + n * unit);
  }
}
