import { api } from './client';
import type { SessionUser } from '@/lib/auth/session';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

export const authApi = {
  login: (email: string, password: string) =>
    api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }),

  register: (input: {
    email: string;
    phone: string;
    password: string;
    fullName: string;
    role?: 'customer' | 'driver';
    licenseNumber?: string;
    licenseExpiry?: string;
  }) => api<AuthResponse>('/auth/register', { method: 'POST', body: input }),

  logout: () => api<{ success: boolean }>('/auth/logout', { method: 'POST' }),
};
