'use client';

import { useCallback } from 'react';
import { posthog } from '@/lib/analytics/posthog';

// ── Event catalogue ──────────────────────────────────────────────────────────

export type AnalyticsEvent =
  // Customer
  | { event: 'user_signed_up';            props: { role: string } }
  | { event: 'user_logged_in';            props: { role: string } }
  | { event: 'user_logged_out';           props: { role: string } }
  | { event: 'location_selected';         props: { type: 'pickup' | 'dropoff' } }
  | { event: 'fare_viewed';               props: { vehicle_type: string; distance_km: number; fare_pkr: number } }
  | { event: 'ride_requested';            props: { vehicle_type: string; booking_type: string; distance_km: number; fare_pkr: number } }
  | { event: 'ride_cancelled';            props: { booking_id: string; reason?: string } }
  | { event: 'ride_completed';            props: { booking_id: string } }
  // Driver
  | { event: 'driver_online';             props: Record<string, never> }
  | { event: 'driver_offline';            props: Record<string, never> }
  | { event: 'request_received';          props: { booking_id: string; booking_type: string } }
  | { event: 'request_accepted';          props: { booking_id: string; vehicle_type: string } }
  | { event: 'request_skipped';           props: { booking_id: string } }
  | { event: 'bid_submitted';             props: { booking_id: string; amount_pkr: number } }
  | { event: 'trip_started';              props: { booking_id: string } }
  | { event: 'trip_completed';            props: { booking_id: string } }
  // Admin
  | { event: 'dashboard_viewed';          props: { section: string } }
  | { event: 'user_managed';              props: { action: string; target_role: string } }
  | { event: 'ride_monitored';            props: { booking_id: string } }
  // Real-time / map
  | { event: 'live_tracking_started';     props: { booking_id: string; role: 'customer' | 'driver' } }
  | { event: 'route_loaded';              props: { distance_km: number; duration_minutes: number } };

type EventName = AnalyticsEvent['event'];
type EventProps<E extends EventName> = Extract<AnalyticsEvent, { event: E }>['props'];

export function useAnalytics() {
  const track = useCallback(<E extends EventName>(event: E, props: EventProps<E>) => {
    if (typeof window === 'undefined' || !posthog.__loaded) return;
    posthog.capture(event, props as Record<string, unknown>);
  }, []);

  const identify = useCallback((
    userId: string,
    traits: { email: string; role: string; name?: string; phone?: string },
  ) => {
    if (typeof window === 'undefined' || !posthog.__loaded) return;
    posthog.identify(userId, {
      email: traits.email,
      role:  traits.role,
      name:  traits.name,
      phone: traits.phone,
    });
  }, []);

  const reset = useCallback(() => {
    if (typeof window === 'undefined' || !posthog.__loaded) return;
    posthog.reset();
  }, []);

  return { track, identify, reset };
}
