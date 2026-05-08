import { api } from './client';

export interface Bid {
  id: string;
  bookingId: string;
  driverId: string;
  amount: number;
  etaMinutes: number | null;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
  expiresAt: string | null;
  createdAt: string;
  driver: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    ratingAvg: number;
    totalTrips: number;
    truck: { plateNumber: string; type: string; model: string | null } | null;
  };
}

export interface SubmitBidInput {
  amount: number;
  etaMinutes?: number;
  message?: string;
  expiresInSeconds?: number;
}

export const biddingApi = {
  submit: (bookingId: string, input: SubmitBidInput) =>
    api<Bid>(`/bookings/${bookingId}/bids`, { method: 'POST', body: input }),

  list: (bookingId: string) => api<Bid[]>(`/bookings/${bookingId}/bids`),

  accept: (bookingId: string, bidId: string) =>
    api(`/bookings/${bookingId}/bids/${bidId}/accept`, { method: 'PATCH' }),

  withdraw: (bookingId: string, bidId: string) =>
    api(`/bookings/${bookingId}/bids/${bidId}/withdraw`, { method: 'PATCH' }),
};
