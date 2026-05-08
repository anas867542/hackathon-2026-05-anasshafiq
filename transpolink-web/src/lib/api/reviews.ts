import { api } from './client';

export interface ReviewPayload {
  bookingId: string;
  score: number;
  comment?: string;
}

export interface Review {
  id: string;
  score: number;
  comment?: string | null;
  createdAt: string;
  reviewer: { fullName: string; avatarUrl: string | null };
}

export const reviewsApi = {
  submit: (payload: ReviewPayload): Promise<Review> =>
    api<Review>('/reviews', { method: 'POST', body: payload }),

  hasReviewed: (bookingId: string): Promise<{ reviewed: boolean }> =>
    api<{ reviewed: boolean }>('/reviews/has-reviewed', { query: { bookingId } }),

  listForUser: (userId: string, take = 20, skip = 0): Promise<Review[]> =>
    api<Review[]>('/reviews', { query: { userId, take, skip } }),
};
