import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { UserRole } from '@prisma/client';
import { API } from './app';
import { getPrisma } from './db';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  driverId?: string;
  accessToken: string;
  refreshToken: string;
}

let counter = 0;
const next = () => ++counter;

const STRONG_PASSWORD = 'TestPass1234';

export async function registerUser(
  app: INestApplication,
  overrides: Partial<{
    email: string;
    phone: string;
    password: string;
    fullName: string;
    role: UserRole;
    licenseNumber: string;
    licenseExpiry: string;
  }> = {},
): Promise<TestUser> {
  const i = next();
  const role = overrides.role ?? UserRole.customer;
  const body = {
    email: overrides.email ?? `user${i}@test.local`,
    phone: overrides.phone ?? `+92300000${String(1000 + i).padStart(4, '0')}`,
    password: overrides.password ?? STRONG_PASSWORD,
    fullName: overrides.fullName ?? `User ${i}`,
    role,
    ...(role === UserRole.driver
      ? {
          licenseNumber: overrides.licenseNumber ?? `LIC-${i}-${Date.now()}`,
          licenseExpiry: overrides.licenseExpiry ?? '2030-01-01',
        }
      : {}),
  };

  const res = await request(app.getHttpServer())
    .post(`${API}/auth/register`)
    .send(body)
    .expect(201);

  const r = res.body as {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; role: UserRole; driverId?: string };
  };

  return {
    id: r.user.id,
    email: r.user.email,
    password: body.password,
    role: r.user.role,
    driverId: r.user.driverId,
    accessToken: r.accessToken,
    refreshToken: r.refreshToken,
  };
}

export async function registerCustomer(app: INestApplication): Promise<TestUser> {
  return registerUser(app, { role: UserRole.customer });
}

export async function registerDriver(
  app: INestApplication,
  opts: { lat?: number; lng?: number; truckType?: string; online?: boolean } = {},
): Promise<TestUser> {
  const driver = await registerUser(app, { role: UserRole.driver });
  const prisma = getPrisma();

  // Activate driver + add a truck so matching works
  if (driver.driverId) {
    await prisma.driver.update({
      where: { id: driver.driverId },
      data: {
        currentLat: opts.lat ?? 24.8607,
        currentLng: opts.lng ?? 67.0011,
        status: opts.online ? 'online' : 'offline',
        lastLocationAt: new Date(),
      },
    });
    await prisma.truck.create({
      data: {
        driverId: driver.driverId,
        type: (opts.truckType as never) ?? 'mini_truck',
        plateNumber: `PLT-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        capacityKg: 1500,
        isPrimary: true,
        isActive: true,
      },
    });
  }
  return driver;
}

export async function registerAdmin(app: INestApplication): Promise<TestUser> {
  // Admin role bypasses some guards. Created via direct DB insert because the
  // public register endpoint allows any role per RegisterDto.
  return registerUser(app, { role: UserRole.admin });
}

export const validBookingBody = (overrides: Record<string, unknown> = {}) => ({
  vehicleType: 'mini_truck',
  pickup: { address: 'Karachi Pickup', lat: 24.8607, lng: 67.0011 },
  dropoff: { address: 'Karachi Drop', lat: 24.9056, lng: 67.0822 },
  goodsDescription: 'Test cargo',
  estimatedWeightKg: 200,
  bookingType: 'instant',
  ...overrides,
});

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
