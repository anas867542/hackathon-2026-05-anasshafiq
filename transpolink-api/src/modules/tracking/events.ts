/**
 * Wire-format event types shared between the NestJS gateway and any client.
 * Keep this file dependency-free so it can be copied to the frontend.
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
  at: string; // ISO8601
}

export interface BookingStatusEvent {
  bookingId: string;
  status: string;
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
  truck?: {
    plateNumber: string;
    type: string;
    model?: string | null;
  } | null;
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

/** Event names used in `socket.emit` / `socket.on` calls. */
export const TrackingEvents = {
  // client → server
  BookingSubscribe:   'booking:subscribe',
  BookingUnsubscribe: 'booking:unsubscribe',
  DriverLocation:     'driver:location',

  // server → client
  BookingStatus:           'booking:status',
  BookingDriverLocation:   'booking:driver_location',
  BookingMatched:          'booking:matched',
  BookingNewRequest:       'booking:new_request',
  BookingNoDrivers:        'booking:no_drivers',

  // bidding (server → client)
  BidReceived:             'booking:bid_received',
  BidAccepted:             'booking:bid_accepted',
  BidRejected:             'booking:bid_rejected',
  BidWithdrawn:            'booking:bid_withdrawn',
} as const;
