'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket/client';
import {
  BookingDriverLocationEvent,
  BookingMatchedEvent,
  BookingStatusEvent,
  TrackingEvents,
} from '@/lib/socket/events';
import { useLiveDriver, SmoothedDriver } from './useLiveDriver';

export interface UseBookingTrackingResult {
  /** Raw last-received WS event — use for speed, timestamp display. */
  driverLocation: BookingDriverLocationEvent | null;
  /** 60 fps smoothed + dead-reckoned driver position — use for map rendering. */
  smoothedDriver: SmoothedDriver | null;
  /** True when no driver location update arrived in the last 8 seconds. */
  isStale: boolean;
  /** Milliseconds since the last driver location event was received. */
  signalAgeMs: number;
  status: BookingStatusEvent['status'] | null;
  matchedDriver: BookingMatchedEvent | null;
  isConnected: boolean;
  lastError: string | null;
  noDriversMessage: string | null;
}

/**
 * Customer-side hook: subscribes to a booking room and exposes
 *  • raw driver location events (for speed, timestamp display)
 *  • 60 fps smoothed + dead-reckoned position for map rendering
 *  • status changes, driver match info, and signal quality state
 */
export function useBookingTracking(
  bookingId: string | null,
  token: string | null,
): UseBookingTrackingResult {
  const [driverLocation, setDriverLocation] = useState<BookingDriverLocationEvent | null>(null);
  const [status, setStatus]                 = useState<BookingStatusEvent['status'] | null>(null);
  const [matchedDriver, setMatchedDriver]   = useState<BookingMatchedEvent | null>(null);
  const [isConnected, setIsConnected]       = useState(false);
  const [lastError, setLastError]           = useState<string | null>(null);
  const [noDriversMessage, setNoDriversMessage] = useState<string | null>(null);

  // Animation engine — runs a 60 fps rAF loop from the moment the hook mounts.
  // `onLocationEvent` is a stable callback (useCallback(fn, [])) safe to call
  // inside socket.on handlers without triggering useEffect re-runs.
  const { result: liveDriver, onLocationEvent } = useLiveDriver();

  useEffect(() => {
    if (!bookingId || !token) return;

    const socket = getSocket(token);

    const onConnect = () => {
      setIsConnected(true);
      setLastError(null);
      socket.emit(TrackingEvents.BookingSubscribe, { bookingId }, (ack: { ok?: boolean }) => {
        if (!ack?.ok) setLastError('Failed to subscribe to booking room');
      });
    };

    const onDisconnect = () => setIsConnected(false);
    const onConnectError = (err: Error) => setLastError(err.message);

    const onLocation = (e: BookingDriverLocationEvent) => {
      if (e.bookingId !== bookingId) return;
      setDriverLocation(e);
      onLocationEvent(e); // feed raw event into the 60 fps animation engine
    };

    const onStatus = (e: BookingStatusEvent) => {
      if (e.bookingId !== bookingId) return;
      setStatus(e.status);
      if (e.status !== 'pending') setNoDriversMessage(null);
    };

    const onNoDrivers = (e: { bookingId: string; message?: string }) => {
      if (e.bookingId !== bookingId) return;
      setNoDriversMessage(e.message ?? 'No drivers available nearby right now.');
    };

    const onMatched = (e: BookingMatchedEvent) => {
      if (e.bookingId === bookingId) setMatchedDriver(e);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on(TrackingEvents.BookingDriverLocation, onLocation);
    socket.on(TrackingEvents.BookingStatus, onStatus);
    socket.on(TrackingEvents.BookingNoDrivers, onNoDrivers);
    socket.on(TrackingEvents.BookingMatched, onMatched);

    if (socket.connected) onConnect();

    return () => {
      socket.emit(TrackingEvents.BookingUnsubscribe, { bookingId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off(TrackingEvents.BookingDriverLocation, onLocation);
      socket.off(TrackingEvents.BookingStatus, onStatus);
      socket.off(TrackingEvents.BookingNoDrivers, onNoDrivers);
      socket.off(TrackingEvents.BookingMatched, onMatched);
    };
  }, [bookingId, token, onLocationEvent]);

  return {
    driverLocation,
    smoothedDriver:  liveDriver.smoothed,
    isStale:         liveDriver.isStale,
    signalAgeMs:     liveDriver.signalAgeMs,
    status,
    matchedDriver,
    isConnected,
    lastError,
    noDriversMessage,
  };
}
