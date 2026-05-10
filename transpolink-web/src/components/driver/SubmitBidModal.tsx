'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { biddingApi } from '@/lib/api/bidding';
import { ApiError } from '@/lib/api/client';
import { formatCurrency } from '@/lib/utils';
import type { NewBookingRequestEvent } from '@/lib/socket/events';

interface Props {
  request: NewBookingRequestEvent;
  onSubmitted: (amountPkr: number) => void;
  onClose: () => void;
}

export function SubmitBidModal({ request, onSubmitted, onClose }: Props) {
  const [amount, setAmount] = useState<number>(request.estimatedFare);
  const [etaMinutes, setEtaMinutes] = useState<string>('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (amount <= 0) {
      setError('Enter a price greater than zero.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await biddingApi.submit(request.bookingId, {
        amount,
        etaMinutes: etaMinutes ? Number(etaMinutes) : undefined,
        message: message.trim() || undefined,
      });
      onSubmitted(amount);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit bid');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-soft">
        <div className="border-b border-zinc-100 p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Submit a bid · {request.referenceCode}
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">
            {request.pickup.address.split(',')[0]} → {request.dropoff.address.split(',')[0]}
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            {request.distanceKm.toFixed(1)} km · suggested {formatCurrency(request.estimatedFare)}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-5">
          <Input
            label="Your price (PKR)"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            hint="Customer will see your offer alongside others. Lower wins more often."
            required
          />
          <Input
            label="ETA to pickup (min)"
            type="number"
            min={1}
            value={etaMinutes}
            onChange={(e) => setEtaMinutes(e.target.value)}
            placeholder="Optional"
          />
          <Textarea
            label="Note to customer"
            placeholder="I'm 5 minutes away and have a covered truck."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
          />
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" isLoading={submitting}>
              Submit bid
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
