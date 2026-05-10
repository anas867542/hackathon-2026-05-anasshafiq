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
import { AnalyticsService } from '../analytics/analytics.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleProfile } from './strategies/google.strategy';

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
    private analytics: AnalyticsService,
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

    const tokens = await this.issueTokens(user.id, user.email, user.role, user.driver?.id ?? null);
    this.analytics.identify(user.id, { email: user.email, role: user.role, name: user.fullName });
    this.analytics.capture(user.id, 'user_signed_up', { role: user.role });
    return tokens;
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

    const tokens = await this.issueTokens(user.id, user.email, user.role, user.driver?.id ?? null);
    this.analytics.capture(user.id, 'user_logged_in', { role: user.role });
    return tokens;
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

  async googleAuth(profile: GoogleProfile) {
    const role = (Object.values(UserRole).includes(profile.role as UserRole)
      ? profile.role
      : UserRole.customer) as UserRole;

    // Try to find existing user by googleId or email
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: profile.googleId }, { email: profile.email }] },
      include: { driver: { select: { id: true } } },
    });

    if (user) {
      // Link Google account if not already linked
      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: profile.googleId,
            authProvider: 'google',
            profileImage: profile.profileImage ?? user.profileImage,
            status: UserStatus.active,
            lastLoginAt: new Date(),
          },
          include: { driver: { select: { id: true } } },
        });
      } else {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      }
    } else {
      // Create new user via Google
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          fullName: profile.fullName,
          googleId: profile.googleId,
          authProvider: 'google',
          profileImage: profile.profileImage,
          role,
          status: UserStatus.active,
          emailVerifiedAt: new Date(),
          driver:
            role === UserRole.driver
              ? { create: { licenseNumber: `GOOGLE-${profile.googleId}`, licenseExpiry: new Date('2099-12-31') } }
              : undefined,
        },
        include: { driver: { select: { id: true } } },
      });
    }

    const isNewUser = !user.googleId || !user.lastLoginAt;
    const tokens = await this.issueTokens(user.id, user.email, user.role, user.driver?.id ?? null);
    this.analytics.identify(user.id, { email: user.email, role: user.role, name: user.fullName });
    this.analytics.capture(user.id, isNewUser ? 'user_signed_up' : 'user_logged_in', { role: user.role, provider: 'google' });
    return tokens;
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
