/**
 * Mirror of transpolink-api/src/modules/tracking/events.ts
 * Keep in sync with the backend.
 */

export interface DriverLocationPayload {
  bookingId: string;
  lat: number;
  lng: number;
  speedKmh?: number;
  heading?: number;
}

export interface BookingDriverLocationEvent {
  bookingId: string;
  lat: number;
  lng: number;
  speedKmh?: number;
  heading?: number;
  at: string;
}

export interface BookingStatusEvent {
  bookingId: string;
  status:
    | 'pending'
    | 'matched'
    | 'accepted'
    | 'arrived'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'expired';
  at: string;
  cancelledBy?: string;
  reason?: string;
}

export interface BookingMatchedEvent {
  bookingId: string;
  driver: {
    id: string;
    fullName?: string;
    phone?: string;
    avatarUrl?: string | null;
    rating: number;
  };
  truck?: { plateNumber: string; type: string; model?: string | null } | null;
  acceptedAt: string;
}

export interface NewBookingRequestEvent {
  bookingId: string;
  referenceCode: string;
  bookingType: 'instant' | 'bidding' | 'scheduled';
  vehicleType: string;
  pickup: { address: string; lat: number; lng: number };
  dropoff: { address: string; lat: number; lng: number };
  distanceKm: number;
  durationMinutes: number | null;
  estimatedFare: number;
  goodsDescription?: string | null;
  estimatedWeightKg?: number | null;
  customerName?: string;
  expiresAt: string;
}

export interface BidSummary {
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

export interface BidReceivedEvent {
  bookingId: string;
  bid: BidSummary;
}

export interface BidAcceptedEvent {
  bookingId: string;
  bidId: string;
  amount: number;
}

export interface BidRejectedEvent {
  bookingId: string;
}

export interface BidWithdrawnEvent {
  bookingId: string;
  bidId: string;
}

export const TrackingEvents = {
  BookingSubscribe:   'booking:subscribe',
  BookingUnsubscribe: 'booking:unsubscribe',
  DriverLocation:     'driver:location',

  BookingStatus:           'booking:status',
  BookingDriverLocation:   'booking:driver_location',
  BookingMatched:          'booking:matched',
  BookingNewRequest:       'booking:new_request',
  BookingNoDrivers:        'booking:no_drivers',

  BidReceived:             'booking:bid_received',
  BidAccepted:             'booking:bid_accepted',
  BidRejected:             'booking:bid_rejected',
  BidWithdrawn:            'booking:bid_withdrawn',
} as const;
