import { api } from './client';
import type { NewBookingRequestEvent } from '@/lib/socket/events';

export type VehicleType =
  | 'mini_truck'
  | 'pickup'
  | 'medium_truck'
  | 'large_truck'
  | 'container'
  | 'flatbed'
  | 'refrigerated';

export type BookingStatus =
  | 'pending'
  | 'matched'
  | 'accepted'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type BookingType = 'instant' | 'bidding' | 'scheduled';

export interface BookingDriver {
  id: string;
  ratingAvg: string | number;
  ratingCount?: number;
  totalTrips: number;
  currentLat?: string | number | null;
  currentLng?: string | number | null;
  user: {
    fullName: string;
    phone: string;
    avatarUrl: string | null;
  };
}

export interface BookingTruck {
  id: string;
  plateNumber: string;
  type: VehicleType;
  model?: string | null;
  make?: string | null;
  capacityKg?: number;
}

export interface Booking {
  id: string;
  referenceCode: string;
  customerId: string;
  driverId: string | null;
  vehicleType: VehicleType;
  pickupAddress: string;
  pickupLat: string;
  pickupLng: string;
  dropoffAddress: string;
  dropoffLat: string;
  dropoffLng: string;
  goodsDescription?: string | null;
  estimatedWeightKg?: number | null;
  distanceKm?: string | null;
  durationMinutes?: number | null;
  estimatedFare?: string | null;
  finalFare?: string | null;
  bookingType: BookingType;
  status: BookingStatus;
  createdAt: string;
  acceptedAt?: string | null;
  driver?: BookingDriver | null;
  truck?: BookingTruck | null;
}

export interface TripLocation {
  lat: number;
  lng: number;
  speedKmh: number | null;
  heading: number | null;
  recordedAt: string;
}

export interface CreateBookingInput {
  vehicleType: VehicleType;
  pickup: { address: string; lat: number; lng: number };
  dropoff: { address: string; lat: number; lng: number };
  goodsDescription?: string;
  estimatedWeightKg?: number;
  bookingType?: BookingType;
}

export const bookingsApi = {
  create: (input: CreateBookingInput) =>
    api<Booking>('/bookings', { method: 'POST', body: input }),

  list: (query: { status?: BookingStatus; page?: number; pageSize?: number } = {}) =>
    api<{ items: Booking[]; total: number; page: number; pageSize: number }>(
      '/bookings',
      { query },
    ),

  get: (id: string) => api<Booking>(`/bookings/${id}`),

  cancel: (id: string, reason?: string) =>
    api<Booking>(`/bookings/${id}/cancel`, { method: 'PATCH', body: { reason } }),

  accept: (id: string, truckId?: string) =>
    api<Booking>(`/bookings/${id}/accept`, { method: 'PATCH', body: { truckId } }),

  arrive: (id: string) => api<Booking>(`/bookings/${id}/arrive`, { method: 'PATCH' }),
  start:  (id: string) => api<Booking>(`/bookings/${id}/start`,  { method: 'PATCH' }),
  complete: (id: string) => api<Booking>(`/bookings/${id}/complete`, { method: 'PATCH' }),

  getLocations: (id: string) => api<TripLocation[]>(`/bookings/${id}/locations`),

  getAvailable: () => api<NewBookingRequestEvent[]>('/bookings/available'),
};
