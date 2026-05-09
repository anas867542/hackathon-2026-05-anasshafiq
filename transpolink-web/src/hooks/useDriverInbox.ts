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
  /**
   * Client-side timestamp (epoch ms) set when the item was first added to the
   * inbox. Used by the sweep timer instead of `expiresAt` so that any clock
   * skew or timezone weirdness in the server's `expiresAt` can't cause a fresh
   * booking to be swept away the moment it arrives.
   */
  receivedAt?: number;
}

const CLIENT_TTL_MS = 5 * 60 * 1000;

const INBOX_STORAGE_KEY = 'driver.inbox';

function loadPersistedInbox(): InboxItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(INBOX_STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw) as InboxItem[];
    const now = Date.now();
    return items.filter((item) => {
      const stamp = item.receivedAt ?? now;
      return now - stamp < CLIENT_TTL_MS;
    });
  } catch {
    return [];
  }
}

function persistInbox(items: InboxItem[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(items));
  } catch { /* quota exceeded — ignore */ }
}

/**
 * Driver inbox: listens for incoming requests, lets the driver mark a request
 * as "bid submitted", and reacts to bid accept/reject events from the server.
 * Inbox is persisted to sessionStorage so page remounts don't lose pending requests.
 */
export function useDriverInbox(token: string | null) {
  const [inbox, setInbox] = useState<InboxItem[]>(loadPersistedInbox);
  const [winner, setWinner] = useState<BidAcceptedEvent | null>(null);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    const onNew = (e: NewBookingRequestEvent) => {
      setInbox((prev) =>
        prev.find((b) => b.bookingId === e.bookingId)
          ? prev
          : [{ ...e, receivedAt: Date.now() }, ...prev],
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

  // Persist inbox to sessionStorage on every change so remounts restore it
  useEffect(() => {
    persistInbox(inbox);
  }, [inbox]);

  // Clear persisted inbox when token is removed (logout / session end)
  useEffect(() => {
    if (!token && typeof window !== 'undefined') {
      sessionStorage.removeItem(INBOX_STORAGE_KEY);
      setInbox([]);
    }
  }, [token]);

  // Sweep client-expired offers every second. Use the client-stamped `receivedAt`
  // (set when the item was first added) instead of the server's `expiresAt`. This
  // makes the sweep robust against clock skew or timezone issues that could
  // otherwise cause a fresh booking to look "already expired" the moment it arrives.
  useEffect(() => {
    const i = window.setInterval(() => {
      setInbox((prev) => {
        if (prev.length === 0) return prev;
        const now = Date.now();
        const next = prev.filter((o) => {
          const stamp = o.receivedAt ?? now;
          return now - stamp < CLIENT_TTL_MS;
        });
        return next.length === prev.length ? prev : next;
      });
    }, 1000);
    return () => window.clearInterval(i);
  }, []);

  function mergeItems(items: NewBookingRequestEvent[]) {
    setInbox((prev) => {
      const known = new Set(prev.map((b) => b.bookingId));
      const now = Date.now();
      const fresh = items
        .filter((b) => !known.has(b.bookingId))
        .map((b) => ({ ...b, receivedAt: now } as InboxItem));
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
