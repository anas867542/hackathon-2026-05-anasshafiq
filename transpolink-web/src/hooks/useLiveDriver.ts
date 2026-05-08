'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BookingDriverLocationEvent } from '@/lib/socket/events';

// ── Public types ─────────────────────────────────────────────────────────────

export interface SmoothedDriver {
  lat: number;
  lng: number;
  heading: number;
  speedKmh: number;
}

export interface UseLiveDriverResult {
  smoothed: SmoothedDriver | null;
  /** True when no location event has arrived for >STALE_MS */
  isStale: boolean;
  /** Milliseconds since the last WS event arrived on this client */
  signalAgeMs: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STALE_MS       = 8_000;   // 8 s without update → signal lost
const DR_CAP         = 1.5;     // stop dead-reckoning at 150 % of expected interval
const DEFAULT_IV_MS  = 2_000;   // assumed GPS interval before self-calibration
const HEADING_SNAP   = 5;       // ° dead-band to suppress truck-icon micro-flicker

// ── Math helpers ─────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Smooth-step (cubic ease in-out), t clamped to [0, 1] */
function smoothStep(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/** Shortest-arc angular interpolation — avoids 359°→1° jumping through 180° */
function lerpAngle(a: number, b: number, t: number) {
  const diff = ((b - a + 540) % 360) - 180; // map delta to [-180, 180]
  return (a + diff * t + 360) % 360;
}

/** Compass bearing (degrees [0, 360)) from point `a` to point `b` */
function bearing(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLng = toR(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(toR(b.lat));
  const x =
    Math.cos(toR(a.lat)) * Math.sin(toR(b.lat)) -
    Math.sin(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ── Internal types ───────────────────────────────────────────────────────────

interface Waypoint {
  lat: number;
  lng: number;
  heading: number;
  speedKmh: number;
  /** performance.now() timestamp when this event was received on the client */
  t: number;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Dead-reckoning animation engine for a remote driver's position.
 *
 * Usage:
 *   const { result, onLocationEvent } = useLiveDriver();
 *
 * Call `onLocationEvent(e)` every time a `booking:driver_location` WS event
 * arrives.  The hook runs a 60 fps rAF loop that:
 *   • interpolates between the previous and current GPS waypoints (smooth-step)
 *   • dead-reckons beyond the expected interval using speed + heading
 *   • auto-calibrates the expected GPS interval from real inter-event timing
 *   • suppresses heading micro-jitter to avoid rebuilding the truck SVG icon
 *     60 times per second
 */
export function useLiveDriver(): {
  result: UseLiveDriverResult;
  onLocationEvent: (e: BookingDriverLocationEvent) => void;
} {
  const [smoothed, setSmoothed]   = useState<SmoothedDriver | null>(null);
  const [isStale, setIsStale]     = useState(false);
  const [signalAgeMs, setAgeMs]   = useState(0);

  // Two-slot ring buffer: [previous waypoint, current waypoint]
  const pts        = useRef<[Waypoint | null, Waypoint | null]>([null, null]);
  // Self-calibrating expected GPS interval (EMA)
  const ivMs       = useRef(DEFAULT_IV_MS);
  // Last displayed heading — used for dead-band suppression
  const lastHeadH  = useRef(0);

  /**
   * Feed a new location event into the animation engine.
   * Stable reference via useCallback([]) — safe to include in socket.on calls
   * without causing useEffect re-runs.
   */
  const onLocationEvent = useCallback((e: BookingDriverLocationEvent) => {
    const now = performance.now();
    const [, cur] = pts.current;

    // Self-calibrate the expected interval from real inter-event timing
    if (cur) {
      const gap = now - cur.t;
      if (gap > 400 && gap < 12_000) {
        // Exponential moving average — reacts quickly but smooths jitter
        ivMs.current = ivMs.current * 0.7 + gap * 0.3;
      }
    }

    // Compute bearing from movement vector.
    // GPS heading is unreliable below ~5 km/h; blend computed + GPS above that.
    const speed    = e.speedKmh ?? 0;
    const computed = cur ? bearing(cur, e) : (e.heading ?? lastHeadH.current);
    const heading  =
      e.heading != null && speed > 5
        ? e.heading * 0.4 + computed * 0.6   // blend GPS + movement bearing
        : computed;

    pts.current = [cur, { lat: e.lat, lng: e.lng, heading, speedKmh: speed, t: now }];
  }, []);

  // ── 60 fps animation loop ─────────────────────────────────────────────────
  useEffect(() => {
    let rafId: number;

    const tick = () => {
      const [prev, cur] = pts.current;
      const now = performance.now();

      if (cur) {
        const elapsed = now - cur.t;
        const alpha   = elapsed / ivMs.current; // 0 = just received → ∞ as time passes
        const stale   = elapsed > STALE_MS;

        setAgeMs(Math.round(elapsed));
        setIsStale(stale);

        let lat: number, lng: number, heading: number;

        if (prev && alpha <= 1.0) {
          // ── Phase 1: smooth interpolation between prev and cur waypoints ─
          const t = smoothStep(alpha);
          lat     = lerp(prev.lat, cur.lat, t);
          lng     = lerp(prev.lng, cur.lng, t);
          heading = lerpAngle(prev.heading, cur.heading, t);

        } else if (!stale && cur.speedKmh > 1 && alpha <= DR_CAP) {
          // ── Phase 2: dead reckoning — extrapolate beyond cur using physics ─
          // Extrapolate the excess time beyond the expected interval
          const extraMs = elapsed - ivMs.current;
          const distM   = (cur.speedKmh / 3.6) * (extraMs / 1000); // metres
          const hRad    = (cur.heading * Math.PI) / 180;
          // Flat-earth approximation (accurate to < 0.1 % for < 1 km)
          lat     = cur.lat + (distM * Math.cos(hRad)) / 111_111;
          lng     = cur.lng + (distM * Math.sin(hRad)) /
                    (111_111 * Math.cos((cur.lat * Math.PI) / 180));
          heading = cur.heading;

        } else {
          // ── Phase 3: stale / stationary — freeze at last known position ──
          lat     = cur.lat;
          lng     = cur.lng;
          heading = cur.heading;
        }

        // Dead-band: only update heading if change exceeds HEADING_SNAP degrees.
        // Prevents the truck SVG from being rebuilt 60 × per second for noise.
        const displayH =
          Math.abs(heading - lastHeadH.current) >= HEADING_SNAP
            ? heading
            : lastHeadH.current;
        lastHeadH.current = displayH;

        setSmoothed({ lat, lng, heading: displayH, speedKmh: cur.speedKmh });
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return { result: { smoothed, isStale, signalAgeMs }, onLocationEvent };
}
