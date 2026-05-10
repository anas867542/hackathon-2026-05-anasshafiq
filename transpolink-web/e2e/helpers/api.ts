/**
 * Direct REST helpers used by Playwright specs to set up state without
 * going through the UI (faster + less brittle than clicking through forms).
 */
import { request as pwRequest, APIRequestContext } from '@playwright/test';

export const API = process.env.API_URL ?? 'http://localhost:4000/api/v1';

const STRONG = 'TestPass1234A';
let counter = Date.now() % 100_000;
const next = () => ++counter;

export interface AuthBundle {
  user: { id: string; email: string; role: string; driverId?: string };
  accessToken: string;
  refreshToken: string;
}

export async function api(): Promise<APIRequestContext> {
  return pwRequest.newContext({ baseURL: API, extraHTTPHeaders: { 'x-test-run': '1' } });
}

export async function registerCustomer(): Promise<AuthBundle> {
  const ctx = await api();
  const i = next();
  const res = await ctx.post('/auth/register', {
    data: {
      email: `pwcust${i}@test.local`,
      phone: `+92301${String(1000000 + i).slice(-7)}`,
      password: STRONG,
      fullName: `PW Customer ${i}`,
      role: 'customer',
    },
  });
  if (!res.ok()) throw new Error(`registerCustomer failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function registerDriver(): Promise<AuthBundle> {
  const ctx = await api();
  const i = next();
  const res = await ctx.post('/auth/register', {
    data: {
      email: `pwdrv${i}@test.local`,
      phone: `+92302${String(1000000 + i).slice(-7)}`,
      password: STRONG,
      fullName: `PW Driver ${i}`,
      role: 'driver',
      licenseNumber: `LIC-PW-${i}`,
      licenseExpiry: '2030-01-01',
    },
  });
  if (!res.ok()) throw new Error(`registerDriver failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function setDriverOnline(token: string, lat = 24.8607, lng = 67.0011) {
  const ctx = await api();
  const res = await ctx.patch('/drivers/me/availability', {
    headers: { Authorization: `Bearer ${token}` },
    data: { status: 'online', lat, lng },
  });
  return res.ok();
}

export async function createBooking(token: string, overrides: Record<string, unknown> = {}) {
  const ctx = await api();
  const res = await ctx.post('/bookings', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      vehicleType: 'mini_truck',
      pickup: { address: 'PW Pickup', lat: 24.8607, lng: 67.0011 },
      dropoff: { address: 'PW Drop', lat: 24.9056, lng: 67.0822 },
      goodsDescription: 'PW cargo',
      estimatedWeightKg: 200,
      bookingType: 'instant',
      ...overrides,
    },
  });
  if (!res.ok()) throw new Error(`createBooking failed: ${res.status()}`);
  return res.json();
}
