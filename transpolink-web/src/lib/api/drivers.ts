import { api } from './client';
import type { VehicleType } from './bookings';

export type DriverStatus = 'offline' | 'online' | 'on_trip' | 'suspended';

export interface NearbyDriver {
  id: string;
  fullName: string;
  ratingAvg: number;
  distanceKm: number;
  lat: number;
  lng: number;
}

export interface NearbyDriversQuery {
  lat: number;
  lng: number;
  radiusKm?: number;
  vehicleType?: VehicleType;
}

export interface DriverProfile {
  id: string;
  status: DriverStatus;
  ratingAvg: string;
  ratingCount: number;
  totalTrips: number;
  totalEarnings: string;
  currentLat: string | number | null;
  currentLng: string | number | null;
  lastLocationAt: string | null;
  user: { fullName: string; email: string; phone: string; avatarUrl?: string | null };
  trucks: Array<{
    id: string;
    plateNumber: string;
    type: string;
    capacityKg: number;
    isPrimary: boolean;
    isActive: boolean;
  }>;
}

export interface DriverOnboardingInput {
  licenseNumber: string;
  licenseExpiry: string;        // ISO date
  cnicNumber?: string;
  licenseDocUrl?: string;
}

export const driversApi = {
  me: () => api<DriverProfile>('/drivers/me'),

  submitOnboarding: (input: DriverOnboardingInput) =>
    api<{ id: string; docStatus: string }>('/drivers/me/onboarding', {
      method: 'PATCH',
      body: input,
    }),

  setAvailability: (status: DriverStatus, lat?: number, lng?: number) =>
    api<{ id: string; status: DriverStatus }>('/drivers/me/availability', {
      method: 'PATCH',
      body: { status, lat, lng },
    }),

  updateLocation: (lat: number, lng: number) =>
    api<{ id: string; currentLat: number; currentLng: number }>('/drivers/me/location', {
      method: 'PATCH',
      body: { lat, lng },
    }),

  nearby: (query: NearbyDriversQuery) =>
    api<NearbyDriver[]>('/drivers/nearby', { query }),
};
