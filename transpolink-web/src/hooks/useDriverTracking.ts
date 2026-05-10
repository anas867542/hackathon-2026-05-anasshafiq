'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket/client';
import { DriverLocationPayload, TrackingEvents } from '@/lib/socket/events';
import { posthog } from '@/lib/analytics/posthog';

export interface UseDriverTrackingOptions {
  bookingId: string | null;
  token: string | null;
  /**
   * How often to push location upstream.
   * Default 1500 ms — fast enough for smooth customer-side animation
   * while staying within Google Maps quota for DirectionsService calls.
   */
  intervalMs?: number;
  /**
   * Minimum displacement (metres) between emits.
   * Prevents flooding the server when the driver is stationary.
   * Default 8 m.
   */
  minimumDisplacementM?: number;
  /** Disable sending without unmounting (e.g. "Pause GPS" button). */
  enabled?: boolean;
}

export interface DriverPosition {
  lat: number;
  lng: number;
  heading?: number;
  speedKmh?: number;
}

export interface UseDriverTrackingResult {
  isStreaming: boolean;
  lastSentAt: Date | null;
  lastError: string | null;
  /** Raw device GPS — updates on every watchPosition fix. */
  currentPosition: DriverPosition | null;
}

// Max GPS accuracy radius we'll accept.  Above this the fix is too noisy to
// emit (common indoors, urban canyons, or desktop/laptop browsers).
const MAX_ACCURACY_M = 150;

// Flat-earth distance in metres between two lat/lng pairs.
// Sufficient for short distances < 1 km (sub-0.1 % error).
function distanceM(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const dLat = (b.latitude  - a.latitude)  * 111_111;
  const dLng = (b.longitude - a.longitude) *
               (111_111 * Math.cos((a.latitude * Math.PI) / 180));
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

// Shortest-arc weighted average of two angles (degrees).
function blendAngle(prev: number, next: number, weight: number) {
  const diff = ((next - prev + 540) % 360) - 180;
  return (prev + diff * weight + 360) % 360;
}

/**
 * Driver-side hook: reads device geolocation via watchPosition and pushes
 * `driver:location` to the server on a calibrated interval.
 *
 * Improvements over the naïve version:
 *  • 1.5 s default interval → smoother customer-side animation
 *  • Movement gate: skips emit if driver moved < minimumDisplacementM
 *  • Accuracy gate: skips noisy fixes (accuracy > MAX_ACCURACY_M)
 *  • Speed/heading EMA smoothing: reduces display jitter without adding lag
 *  • volatile.emit: stale pings are dropped when disconnected (no burst replay)
 */
export function useDriverTracking({
  bookingId,
  token,
  intervalMs = 1500,
  minimumDisplacementM = 8,
  enabled = true,
}: UseDriverTrackingOptions): UseDriverTrackingResult {
  const [isStreaming, setIsStreaming]       = useState(false);
  const [lastSentAt, setLastSentAt]         = useState<Date | null>(null);
  const [lastError, setLastError]           = useState<string | null>(null);
  const [currentPosition, setCurrentPos]   = useState<DriverPosition | null>(null);

  // Refs — never cause re-renders; safe to read inside setInterval
  const lastGeoPos    = useRef<GeolocationCoordinates | null>(null);
  const lastEmitPos   = useRef<GeolocationCoordinates | null>(null);
  // Smoothed heading and speed (EMA) — display only, not used for emit logic
  const smoothHeading = useRef<number | null>(null);
  const smoothSpeed   = useRef<number>(0);

  useEffect(() => {
    if (!bookingId || !token || !enabled) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLastError('Geolocation unavailable');
      return;
    }

    const socket = getSocket(token);

    // ── watchPosition — fires as fast as the device allows (~1–5 Hz on mobile)
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const c = pos.coords;

        // Skip fixes that are too inaccurate
        if (c.accuracy > MAX_ACCURACY_M) return;

        lastGeoPos.current = c;
        setLastError(null);

        // EMA on speed and heading to smooth display jitter.
        // We do NOT smooth position — that would add visible lag to the raw display.
        const rawSpeed  = c.speed != null ? c.speed * 3.6 : 0; // m/s → km/h
        smoothSpeed.current = smoothSpeed.current * 0.4 + rawSpeed * 0.6;

        if (c.heading != null) {
          smoothHeading.current =
            smoothHeading.current == null
              ? c.heading
              : blendAngle(smoothHeading.current, c.heading, 0.6);
        }

        setCurrentPos({
          lat:      c.latitude,
          lng:      c.longitude,
          heading:  smoothHeading.current ?? undefined,
          speedKmh: smoothSpeed.current > 0.5 ? smoothSpeed.current : undefined,
        });
      },
      (err) => setLastError(err.message),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10_000 },
    );

    // ── Emit loop — pushes position upstream every intervalMs
    const tick = () => {
      const pos = lastGeoPos.current;
      if (!pos) return;

      // Movement gate: skip if driver hasn't moved enough since the last emit
      if (lastEmitPos.current) {
        const moved = distanceM(
          { latitude: pos.latitude,  longitude: pos.longitude },
          { latitude: lastEmitPos.current.latitude, longitude: lastEmitPos.current.longitude },
        );
        if (moved < minimumDisplacementM) return;
      }

      lastEmitPos.current = pos;

      const payload: DriverLocationPayload = {
        bookingId,
        lat:      pos.latitude,
        lng:      pos.longitude,
        speedKmh: smoothSpeed.current > 0.5 ? smoothSpeed.current : undefined,
        heading:  smoothHeading.current ?? undefined,
      };

      // volatile: drop silently when disconnected — prevents burst replay on reconnect
      socket.volatile.emit(
        TrackingEvents.DriverLocation,
        payload,
        (ack?: { ok?: boolean }) => { if (ack?.ok) setLastSentAt(new Date()); },
      );
    };

    const timerId = window.setInterval(tick, intervalMs);
    setIsStreaming(true);
    if (posthog.__loaded) posthog.capture('live_tracking_started', { booking_id: bookingId, role: 'driver' });

    return () => {
      window.clearInterval(timerId);
      navigator.geolocation.clearWatch(watchId);
      setIsStreaming(false);
    };
  }, [bookingId, token, intervalMs, minimumDisplacementM, enabled]);

  return { isStreaming, lastSentAt, lastError, currentPosition };
}
