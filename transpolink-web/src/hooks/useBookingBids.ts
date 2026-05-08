'use client';

import { useEffect, useState } from 'react';
import { biddingApi, Bid } from '@/lib/api/bidding';
import { getSocket } from '@/lib/socket/client';
import {
  BidReceivedEvent,
  BidWithdrawnEvent,
  TrackingEvents,
} from '@/lib/socket/events';

/** Insert bid into an already-sorted (ascending amount) array in O(n) — avoids a full sort on every event. */
function insertSorted(list: Bid[], bid: Bid): Bid[] {
  const idx = list.findIndex((b) => b.amount > bid.amount);
  if (idx === -1) return [...list, bid];
  const copy = [...list];
  copy.splice(idx, 0, bid);
  return copy;
}

/**
 * Loads existing bids for a booking, then keeps the list in sync with
 * `booking:bid_received` and `booking:bid_withdrawn` WS events.
 */
export function useBookingBids(bookingId: string | null, token: string | null) {
  const [bids, setBids] = useState<Bid[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    biddingApi
      .list(bookingId)
      .then((list) => {
        if (!cancelled) setBids(list);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId || !token) return;
    const socket = getSocket(token);

    const onReceived = (e: BidReceivedEvent) => {
      if (e.bookingId !== bookingId) return;
      setBids((prev) => {
        const list = prev ?? [];
        const existingIdx = list.findIndex((b) => b.id === e.bid.id);
        if (existingIdx >= 0) {
          // Remove stale entry, re-insert at correct sorted position
          const without = list.filter((_, i) => i !== existingIdx);
          return insertSorted(without, e.bid);
        }
        return insertSorted(list, e.bid);
      });
    };

    const onWithdrawn = (e: BidWithdrawnEvent) => {
      if (e.bookingId !== bookingId) return;
      setBids((prev) => prev?.filter((b) => b.id !== e.bidId) ?? prev);
    };

    socket.on(TrackingEvents.BidReceived, onReceived);
    socket.on(TrackingEvents.BidWithdrawn, onWithdrawn);
    return () => {
      socket.off(TrackingEvents.BidReceived, onReceived);
      socket.off(TrackingEvents.BidWithdrawn, onWithdrawn);
    };
  }, [bookingId, token]);

  async function accept(bidId: string) {
    if (!bookingId) return;
    await biddingApi.accept(bookingId, bidId);
    // Server will emit booking:matched + booking:status; the parent page reacts.
  }

  return { bids, error, accept };
}
