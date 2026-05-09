'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils';
import type { Bid } from '@/lib/api/bidding';

interface Props {
  bids: Bid[] | null;
  onAccept: (bidId: string) => Promise<void>;
}

export function BidsList({ bids, onAccept }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const inflightRef = useRef(false);

  async function handleAccept(bidId: string) {
    if (inflightRef.current) return;
    inflightRef.current = true;
    setPendingId(bidId);
    setError(null);
    try {
      await onAccept(bidId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      inflightRef.current = false;
      setPendingId(null);
    }
  }

  if (bids === null) {
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-full mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-xl">
            🔍
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Waiting for offers</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Nearby drivers will submit their bids here automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
      <ul className="grid gap-3 lg:grid-cols-2">
        {bids.map((bid, i) => {
          const isBest      = i === 0;
          const isAccepting = pendingId === bid.id;
          const isLockedOut = pendingId != null && !isAccepting;

          return (
            <li key={bid.id}>
              <div className={`rounded-2xl border bg-white dark:bg-gray-950 overflow-hidden transition-all ${
                isBest
                  ? 'border-brand-300 dark:border-brand-700 ring-1 ring-brand-200 dark:ring-brand-800 shadow-card-hover'
                  : 'border-gray-100 dark:border-gray-800'
              }`}>
                <div className="p-5 space-y-4">
                  {/* Driver row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-gray-900 dark:bg-white text-sm font-bold text-white dark:text-gray-900">
                        {bid.driver.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{bid.driver.fullName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {bid.driver.ratingAvg.toFixed(1)} ★ · {bid.driver.totalTrips} trips
                          {bid.driver.truck ? ` · ${bid.driver.truck.plateNumber}` : ''}
                        </p>
                      </div>
                    </div>
                    {isBest && <Badge tone="success" size="md">Best offer</Badge>}
                  </div>

                  {/* Price + ETA */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-900 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500">Price</p>
                      <p className="mt-0.5 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {formatCurrency(bid.amount)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-900 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500">ETA</p>
                      <p className="mt-0.5 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {bid.etaMinutes != null ? `${bid.etaMinutes} min` : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Message */}
                  {bid.message && (
                    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400 italic">
                      &ldquo;{bid.message}&rdquo;
                    </div>
                  )}

                  <Button
                    variant={isBest ? 'brand' : 'primary'}
                    className="w-full"
                    onClick={() => handleAccept(bid.id)}
                    isLoading={isAccepting}
                    disabled={isLockedOut}
                  >
                    {isBest ? 'Accept best offer' : 'Accept this offer'}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
