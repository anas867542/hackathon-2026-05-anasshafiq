'use client';

import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { PHASE_NARRATIVE, TripPhase } from '@/lib/booking/phase';

interface Props {
  phase: TripPhase;
  isLive: boolean;
  etaMinutes: number | null;
  distanceKmRemaining: number | null;
  speedKmh?: number | null;
  lastUpdateAt?: Date | null;
  isSignalStale?: boolean;
  signalAgeMs?: number;
}

function useCountdownEta(etaMinutes: number | null): number | null {
  const [display, setDisplay] = useState<number | null>(etaMinutes);
  const lastEtaRef = useRef<number | null>(etaMinutes);
  const lastSetAt  = useRef<number>(Date.now());

  useEffect(() => {
    if (etaMinutes === null) { setDisplay(null); return; }
    lastEtaRef.current = etaMinutes;
    lastSetAt.current  = Date.now();
    setDisplay(etaMinutes);
  }, [etaMinutes]);

  useEffect(() => {
    if (etaMinutes == null) return;
    const id = window.setInterval(() => {
      const ageMin = (Date.now() - lastSetAt.current) / 60_000;
      const est    = Math.max(0, Math.round((lastEtaRef.current ?? 0) - ageMin));
      setDisplay(est);
    }, 30_000);
    return () => clearInterval(id);
  }, [etaMinutes != null]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 px-5 py-5 sm:px-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
            {narrative.eyebrow}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {narrative.headline(displayEta)}
          </h2>
        </div>

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

      <dl className="grid grid-cols-3 gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
        <Stat label="ETA"           value={displayEta != null ? `${displayEta} min` : '—'} />
        <Stat label="Distance left" value={distanceKmRemaining != null ? `${distanceKmRemaining.toFixed(1)} km` : '—'} />
        <Stat label="Speed"         value={speedKmh != null ? `${Math.max(0, Math.round(speedKmh))} km/h` : '—'} />
      </dl>

      {isSignalStale && staleAgeSec > 0 ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Driver signal lost {staleAgeSec}s ago — last known position shown
        </p>
      ) : lastUpdateAt ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Driver location updated {lastUpdateAt.toLocaleTimeString()}
        </p>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500">{label}</dt>
      <dd className="mt-1 text-base font-bold text-gray-900 dark:text-white">{value}</dd>
    </div>
  );
}
