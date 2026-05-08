'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PHASE_NARRATIVE, TripPhase } from '@/lib/booking/phase';

interface Props {
  phase: TripPhase;
  isLive: boolean;
  etaMinutes: number | null;
  distanceKmRemaining: number | null;
  speedKmh?: number | null;
  lastUpdateAt?: Date | null;
  /** True when no driver location update has arrived in the last 8 seconds. */
  isSignalStale?: boolean;
  /** Milliseconds since the last driver location event was received. */
  signalAgeMs?: number;
}

/**
 * ETA display that ticks forward every second between API refreshes.
 * When a new authoritative ETA arrives, resets to the new value.
 * Prevents the jarring "ETA jumps to 12 min, stays frozen, jumps again" UX.
 */
function useCountdownEta(etaMinutes: number | null): number | null {
  const [display, setDisplay] = useState<number | null>(etaMinutes);
  // Track when we last received a fresh ETA from the server
  const lastEtaRef  = useRef<number | null>(etaMinutes);
  const lastSetAt   = useRef<number>(Date.now());

  // Sync to new authoritative value
  useEffect(() => {
    if (etaMinutes === null) { setDisplay(null); return; }
    lastEtaRef.current = etaMinutes;
    lastSetAt.current  = Date.now();
    setDisplay(etaMinutes);
  }, [etaMinutes]);

  // Tick every 30s to give a subtle sense of progress (1 min granularity)
  useEffect(() => {
    if (etaMinutes == null) return;
    const id = window.setInterval(() => {
      const ageMin = (Date.now() - lastSetAt.current) / 60_000;
      const est    = Math.max(0, Math.round((lastEtaRef.current ?? 0) - ageMin));
      setDisplay(est);
    }, 30_000);
    return () => clearInterval(id);
  }, [etaMinutes != null]);

  return display;
}

export function TripStatusCard({
  phase, isLive, etaMinutes, distanceKmRemaining,
  speedKmh, lastUpdateAt, isSignalStale = false, signalAgeMs = 0,
}: Props) {
  const narrative   = PHASE_NARRATIVE[phase];
  const displayEta  = useCountdownEta(etaMinutes);
  const staleAgeSec = Math.round(signalAgeMs / 1000);

  return (
    <Card>
      <CardBody className="space-y-5 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              {narrative.eyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              {narrative.headline(displayEta)}
            </h2>
          </div>

          {/* Signal quality badge */}
          {isSignalStale ? (
            <Badge tone="warning" className="shrink-0">
              <span className="mr-1.5 inline-block size-1.5 rounded-full bg-amber-400" />
              No signal
            </Badge>
          ) : isLive ? (
            <Badge tone="success" className="shrink-0">
              <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-emerald-500" />
              Live
            </Badge>
          ) : (
            <Badge tone="warning" className="shrink-0">
              <span className="mr-1.5 inline-block size-1.5 animate-bounce rounded-full bg-amber-400" />
              Reconnecting
            </Badge>
          )}
        </div>

        <dl className="grid grid-cols-3 gap-4 border-t border-zinc-100 pt-4">
          <Stat
            label="ETA"
            value={displayEta != null ? `${displayEta} min` : '—'}
          />
          <Stat
            label="Distance left"
            value={distanceKmRemaining != null ? `${distanceKmRemaining.toFixed(1)} km` : '—'}
          />
          <Stat
            label="Speed"
            value={speedKmh != null ? `${Math.max(0, Math.round(speedKmh))} km/h` : '—'}
          />
        </dl>

        {/* Signal age — shown while stale; switches to normal update line otherwise */}
        {isSignalStale && staleAgeSec > 0 ? (
          <p className="text-xs text-amber-600">
            Driver signal lost {staleAgeSec}s ago — last known position shown
          </p>
        ) : lastUpdateAt ? (
          <p className="text-xs text-zinc-500">
            Driver location updated {lastUpdateAt.toLocaleTimeString()}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-zinc-500">{label}</dt>
      <dd className="mt-1 text-base font-semibold text-zinc-900">{value}</dd>
    </div>
  );
}
