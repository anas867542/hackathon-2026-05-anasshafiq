'use client';

import { useEffect, useRef, useState } from 'react';

interface LatLng { lat: number; lng: number }

export interface EtaResult {
  durationMinutes: number;
  distanceKm: number;
  computedAt: Date;
}

interface Options {
  origin: LatLng | null;
  destination: LatLng | null;
  /** Minimum elapsed time between OSRM calls. Default 15 s. */
  minIntervalMs?: number;
  /** Minimum driver displacement (metres) before triggering a fresh call. Default 50 m. */
  minMoveMeters?: number;
}

/**
 * Fetches driving ETA via OSRM (free, no API key required).
 * Throttled on two axes (time + distance) to avoid hammering the public server.
 *
 * Uses refs for origin/destination so the 60 fps useLiveDriver position stream
 * does not restart the interval on every animation frame.
 *
 * Returns null until the first result arrives; retains the last known result
 * while the driver is stationary (avoids showing "—" at red lights).
 */
export function useEta({
  origin,
  destination,
  minIntervalMs = 15_000,
  minMoveMeters = 50,
}: Options): EtaResult | null {
  const [eta, setEta] = useState<EtaResult | null>(null);

  const lastFetchAt = useRef(0);
  const lastOrigin  = useRef<LatLng | null>(null);
  const cancelRef   = useRef<(() => void) | null>(null);

  const originRef      = useRef(origin);
  const destinationRef = useRef(destination);
  originRef.current      = origin;
  destinationRef.current = destination;

  useEffect(() => {
    const tryFetch = () => {
      const cur  = originRef.current;
      const dest = destinationRef.current;
      if (!cur || !dest) return;

      const now      = Date.now();
      const moved    = lastOrigin.current ? haversineMeters(lastOrigin.current, cur) : Infinity;
      const tooSoon  = now - lastFetchAt.current < minIntervalMs;
      const tooSmall = moved < minMoveMeters;
      if (tooSoon && tooSmall) return;

      cancelRef.current?.();
      let cancelled = false;
      cancelRef.current = () => { cancelled = true; };

      lastFetchAt.current = now;
      lastOrigin.current  = { ...cur };

      // OSRM expects lng,lat order
      const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${cur.lng},${cur.lat};${dest.lng},${dest.lat}?overview=false`;

      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          if (data.code !== 'Ok' || !data.routes?.[0]) return;
          const route = data.routes[0];
          setEta({
            durationMinutes: Math.max(1, Math.round(route.duration / 60)),
            distanceKm:      route.distance / 1000,
            computedAt:      new Date(),
          });
        })
        .catch(() => { /* retain last known ETA on network error */ });
    };

    tryFetch();
    const id = setInterval(tryFetch, Math.min(minIntervalMs, 5_000));
    return () => {
      clearInterval(id);
      cancelRef.current?.();
    };
  }, [minIntervalMs, minMoveMeters]);

  useEffect(() => {
    if (!destination) setEta(null);
  }, [destination]);

  return eta;
}

function haversineMeters(a: LatLng, b: LatLng) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
