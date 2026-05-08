'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket/client';
import { BookingStatusEvent, TrackingEvents } from '@/lib/socket/events';

export interface DriverTripStatusResult {
  liveStatus: BookingStatusEvent['status'] | null;
  cancellation: { cancelledBy?: string; reason?: string } | null;
  isConnected: boolean;
}

/**
 * Driver-side hook: subscribes the driver socket to their active booking room
 * so real-time status changes (especially customer cancellations) are received
 * without a manual page refresh.
 */
export function useDriverTripStatus(
  bookingId: string | null,
  token: string | null,
): DriverTripStatusResult {
  const [liveStatus, setLiveStatus] = useState<BookingStatusEvent['status'] | null>(null);
  const [cancellation, setCancellation] = useState<{ cancelledBy?: string; reason?: string } | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!bookingId || !token) return;

    const socket = getSocket(token);

    const onConnect = () => {
      setIsConnected(true);
      socket.emit(TrackingEvents.BookingSubscribe, { bookingId });
    };
    const onDisconnect = () => setIsConnected(false);

    const onStatus = (e: BookingStatusEvent) => {
      if (e.bookingId !== bookingId) return;
      setLiveStatus(e.status);
      if (e.status === 'cancelled') {
        setCancellation({ cancelledBy: e.cancelledBy, reason: e.reason });
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(TrackingEvents.BookingStatus, onStatus);

    if (socket.connected) onConnect();

    return () => {
      socket.emit(TrackingEvents.BookingUnsubscribe, { bookingId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(TrackingEvents.BookingStatus, onStatus);
    };
  }, [bookingId, token]);

  return { liveStatus, cancellation, isConnected };
}
