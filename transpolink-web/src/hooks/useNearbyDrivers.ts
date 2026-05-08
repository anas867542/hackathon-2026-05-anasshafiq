'use client';

import { useEffect, useState } from 'react';
import { driversApi, NearbyDriver } from '@/lib/api/drivers';
import type { VehicleType } from '@/lib/api/bookings';

interface Options {
  vehicleType?: VehicleType | null;
  radiusKm?: number;
  /** Base polling interval in ms. Default 10 s. Backs off exponentially on error, capped at 60 s. */
  pollMs?: number;
  /** Disable to pause polling. */
  enabled?: boolean;
}

/**
 * Polls /drivers/nearby on an interval so the booking page can show online
 * drivers around the pickup point as a "heatmap" — Uber-style.
 * Uses exponential backoff on error to avoid hammering the API on network issues.
 */
export function useNearbyDrivers(
  lat: number | null,
  lng: number | null,
  { vehicleType, radiusKm = 5, pollMs = 10_000, enabled = true }: Options = {},
): NearbyDriver[] {
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);

  useEffect(() => {
    if (!enabled || lat == null || lng == null) {
      setDrivers([]);
      return;
    }

    let cancelled = false;
    let delay = pollMs;
    let timerId: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const result = await driversApi.nearby({
          lat,
          lng,
          radiusKm,
          ...(vehicleType ? { vehicleType } : {}),
        });
        if (!cancelled) {
          setDrivers(result);
          delay = pollMs; // reset backoff on success
        }
      } catch {
        // Silent — the booking page is usable without this overlay.
        // Double the wait time on each consecutive error, cap at 60 s.
        delay = Math.min(delay * 2, 60_000);
      } finally {
        if (!cancelled) timerId = setTimeout(tick, delay);
      }
    };

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [lat, lng, radiusKm, vehicleType, pollMs, enabled]);

  return drivers;
}
