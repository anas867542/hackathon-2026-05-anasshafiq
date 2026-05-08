'use client';

import { useRef, useState } from 'react';
import { Card, CardBody } from '@/components/ui/Card';
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
          <Card key={i}>
            <CardBody className="space-y-3 pt-5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-full mt-2" />
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-zinc-100 text-xl">
            🔍
          </div>
          <p className="text-sm font-medium text-zinc-700">Waiting for offers</p>
          <p className="mt-1 text-xs text-zinc-500">
            Nearby drivers will submit their bids here automatically.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
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
              <Card
                className={isBest ? 'border-brand-300 ring-1 ring-brand-200 shadow-card-hover' : ''}
              >
                <CardBody className="space-y-4 pt-5">
                  {/* Driver row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-zinc-900 text-sm font-bold text-white">
                        {bid.driver.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900">{bid.driver.fullName}</p>
                        <p className="text-xs text-zinc-500">
                          {bid.driver.ratingAvg.toFixed(1)} ★ · {bid.driver.totalTrips} trips
                          {bid.driver.truck ? ` · ${bid.driver.truck.plateNumber}` : ''}
                        </p>
                      </div>
                    </div>
                    {isBest && <Badge tone="success" size="md">Best offer</Badge>}
                  </div>

                  {/* Price + ETA */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
                      <p className="text-xs uppercase tracking-wider text-zinc-500">Price</p>
                      <p className="mt-0.5 text-xl font-semibold tracking-tight text-zinc-900">
                        {formatCurrency(bid.amount)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
                      <p className="text-xs uppercase tracking-wider text-zinc-500">ETA</p>
                      <p className="mt-0.5 text-xl font-semibold tracking-tight text-zinc-900">
                        {bid.etaMinutes != null ? `${bid.etaMinutes} min` : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Message */}
                  {bid.message && (
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600 italic">
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
                </CardBody>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
