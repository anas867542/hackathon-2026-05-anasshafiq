'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket/client';
import {
  BidAcceptedEvent,
  BidRejectedEvent,
  NewBookingRequestEvent,
  TrackingEvents,
} from '@/lib/socket/events';

export interface InboxItem extends NewBookingRequestEvent {
  /** True once the driver has submitted a bid for this booking. */
  bidSubmitted?: boolean;
}

/**
 * Driver inbox: listens for incoming requests, lets the driver mark a request
 * as "bid submitted", and reacts to bid accept/reject events from the server.
 */
export function useDriverInbox(token: string | null) {
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [winner, setWinner] = useState<BidAcceptedEvent | null>(null);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    const onNew = (e: NewBookingRequestEvent) => {
      setInbox((prev) =>
        prev.find((b) => b.bookingId === e.bookingId) ? prev : [e, ...prev],
      );
    };
    const onAccepted = (e: BidAcceptedEvent) => {
      setWinner(e);
      setInbox((prev) => prev.filter((b) => b.bookingId !== e.bookingId));
    };
    const onRejected = (e: BidRejectedEvent) => {
      setInbox((prev) => prev.filter((b) => b.bookingId !== e.bookingId));
    };

    socket.on(TrackingEvents.BookingNewRequest, onNew);
    socket.on(TrackingEvents.BidAccepted, onAccepted);
    socket.on(TrackingEvents.BidRejected, onRejected);
    return () => {
      socket.off(TrackingEvents.BookingNewRequest, onNew);
      socket.off(TrackingEvents.BidAccepted, onAccepted);
      socket.off(TrackingEvents.BidRejected, onRejected);
    };
  }, [token]);

  // Sweep expired offers every second — skips work when inbox is already empty
  useEffect(() => {
    const i = window.setInterval(() => {
      setInbox((prev) => {
        if (prev.length === 0) return prev;
        const now = Date.now();
        const next = prev.filter((o) => new Date(o.expiresAt).getTime() > now);
        return next.length === prev.length ? prev : next;
      });
    }, 1000);
    return () => window.clearInterval(i);
  }, []);

  function mergeItems(items: NewBookingRequestEvent[]) {
    setInbox((prev) => {
      const known = new Set(prev.map((b) => b.bookingId));
      const fresh = items.filter((b) => !known.has(b.bookingId));
      return fresh.length === 0 ? prev : [...fresh, ...prev];
    });
  }

  function remove(bookingId: string) {
    setInbox((prev) => prev.filter((o) => o.bookingId !== bookingId));
  }

  function markBidSubmitted(bookingId: string) {
    setInbox((prev) =>
      prev.map((o) => (o.bookingId === bookingId ? { ...o, bidSubmitted: true } : o)),
    );
  }

  function clearWinner() {
    setWinner(null);
  }

  return { inbox, mergeItems, remove, markBidSubmitted, winner, clearWinner };
}
