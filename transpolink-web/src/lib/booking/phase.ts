import type { BookingStatus } from '@/lib/api/bookings';

export type TripPhase =
  | 'searching'
  | 'to_pickup'
  | 'at_pickup'
  | 'to_dropoff'
  | 'completed'
  | 'cancelled';

export function getTripPhase(status: BookingStatus | string | null | undefined): TripPhase {
  switch (status) {
    case 'pending':
    case 'matched':
      return 'searching';
    case 'accepted':
      return 'to_pickup';
    case 'arrived':
      return 'at_pickup';
    case 'in_progress':
      return 'to_dropoff';
    case 'completed':
      return 'completed';
    case 'cancelled':
    case 'expired':
      return 'cancelled';
    default:
      return 'searching';
  }
}

interface Narrative {
  eyebrow: string;
  headline: (etaMin?: number | null) => string;
}

export const PHASE_NARRATIVE: Record<TripPhase, Narrative> = {
  searching: {
    eyebrow: 'Searching',
    headline: () => 'Finding a nearby driver…',
  },
  to_pickup: {
    eyebrow: 'En route to pickup',
    headline: (etaMin) =>
      etaMin != null ? `Driver arriving in ${etaMin} min` : 'Driver is heading to your pickup',
  },
  at_pickup: {
    eyebrow: 'At pickup',
    headline: () => 'Driver has arrived. Loading goods…',
  },
  to_dropoff: {
    eyebrow: 'On the way',
    headline: (etaMin) =>
      etaMin != null ? `Arriving at drop-off in ${etaMin} min` : 'Heading to your drop-off',
  },
  completed: {
    eyebrow: 'Delivered',
    headline: () => 'Trip completed',
  },
  cancelled: {
    eyebrow: 'Cancelled',
    headline: () => 'This trip was cancelled',
  },
};
