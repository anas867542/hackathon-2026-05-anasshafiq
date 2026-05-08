import { api } from './client';
import type { VehicleType } from './bookings';

export interface Truck {
  id: string;
  driverId: string;
  type: VehicleType;
  plateNumber: string;
  capacityKg: number;
  capacityVolumeM3?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  color?: string | null;
  registrationDocUrl?: string | null;
  insuranceDocUrl?: string | null;
  insuranceExpiry?: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreateTruckInput {
  type: VehicleType;
  plateNumber: string;
  capacityKg: number;
  capacityVolumeM3?: number;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  registrationDocUrl?: string;
  insuranceDocUrl?: string;
  insuranceExpiry?: string;
  isPrimary?: boolean;
}

export const trucksApi = {
  create: (input: CreateTruckInput) =>
    api<Truck>('/trucks', { method: 'POST', body: input }),

  list: () => api<Truck[]>('/trucks'),

  get: (id: string) => api<Truck>(`/trucks/${id}`),

  update: (id: string, input: Partial<CreateTruckInput> & { isActive?: boolean }) =>
    api<Truck>(`/trucks/${id}`, { method: 'PATCH', body: input }),

  remove: (id: string) => api<Truck>(`/trucks/${id}`, { method: 'DELETE' }),
};
