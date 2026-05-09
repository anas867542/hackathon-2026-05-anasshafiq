'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/status/StatusBadge';
import { TrackingMap } from '@/components/map/TrackingMap';
import { TripStatusCard } from '@/components/booking/TripStatusCard';
import { BidsList } from '@/components/booking/BidsList';
import { DriverInfoCard } from '@/components/booking/DriverInfoCard';
import { useBookingTracking } from '@/hooks/useBookingTracking';
import { useBookingBids } from '@/hooks/useBookingBids';
import { useEta } from '@/hooks/useEta';
import { useAuth } from '@/hooks/useAuth';
import { useNearbyDrivers } from '@/hooks/useNearbyDrivers';
import { bookingsApi, Booking } from '@/lib/api/bookings';
import { reviewsApi } from '@/lib/api/reviews';
import { session } from '@/lib/auth/session';
import { formatCurrency } from '@/lib/utils';
import { getTripPhase } from '@/lib/booking/phase';
import { RatingModal } from '@/components/booking/RatingModal';

const PROGRESS = ['pending', 'accepted', 'arrived', 'in_progress', 'completed'] as const;

function isValidCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
}

export default function CustomerTrackingPage() {
  const params     = useParams<{ id: string }>();
  const bookingId  = params.id;
  const { hydrated } = useAuth();
  const token = hydrated ? session.getAccessToken() : null;

  const [booking,    setBooking]    = useState<Booking | null>(null);
  const [loadError,  setLoadError]  = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showRating, setShowRating] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    bookingsApi.get(bookingId)
      .then(setBooking)
      .catch((e) => setLoadError((e as Error).message));
  }, [bookingId]);

  const {
    smoothedDriver, driverLocation, isStale, signalAgeMs,
    status, isConnected, matchedDriver, noDriversMessage,
  } = useBookingTracking(bookingId, token);

  useEffect(() => {
    if (!bookingId || !status) return;
    if (status !== 'accepted' && status !== 'completed') return;
    bookingsApi.get(bookingId).then(setBooking).catch(() => {});
  }, [bookingId, status]);

  const liveStatus = status ?? booking?.status ?? 'pending';
  const phase      = getTripPhase(liveStatus);
  const stepIndex  = PROGRESS.indexOf(liveStatus as (typeof PROGRESS)[number]);

  useEffect(() => {
    if (liveStatus !== 'completed' || !bookingId) return;
    reviewsApi.hasReviewed(bookingId)
      .then(({ reviewed }) => { if (!reviewed) setShowRating(true); })
      .catch(() => {});
  }, [liveStatus, bookingId]);

  const pickupCoord = useMemo(() => {
    if (!booking) return null;
    const lat = Number(booking.pickupLat), lng = Number(booking.pickupLng);
    return isValidCoord(lat, lng) ? { lat, lng } : null;
  }, [booking]);

  const dropoffCoord = useMemo(() => {
    if (!booking) return null;
    const lat = Number(booking.dropoffLat), lng = Number(booking.dropoffLng);
    return isValidCoord(lat, lng) ? { lat, lng } : null;
  }, [booking]);

  const initialDriverPos = useMemo(() => {
    if (!booking?.driver) return null;
    const lat = Number(booking.driver.currentLat), lng = Number(booking.driver.currentLng);
    return isValidCoord(lat, lng) ? { lat, lng } : null;
  }, [booking?.driver?.currentLat, booking?.driver?.currentLng]); // eslint-disable-line react-hooks/exhaustive-deps

  const etaTarget =
    phase === 'to_pickup'  ? pickupCoord :
    phase === 'to_dropoff' ? dropoffCoord : null;

  const eta = useEta({ origin: smoothedDriver, destination: etaTarget });

  const nearbyDrivers = useNearbyDrivers(
    pickupCoord?.lat ?? null,
    pickupCoord?.lng ?? null,
    { vehicleType: booking?.vehicleType, radiusKm: 5, enabled: phase === 'searching' },
  );

  const isBiddingPhase = booking?.bookingType === 'bidding' && liveStatus === 'pending';
  const { bids, accept: acceptBid } = useBookingBids(
    isBiddingPhase ? bookingId : null,
    token,
  );

  async function cancel() {
    if (!booking || cancelling) return;
    if (!confirm('Cancel this booking?')) return;
    setCancelling(true);
    try {
      const updated = await bookingsApi.cancel(booking.id, 'Cancelled by customer');
      setBooking(updated);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to cancel booking.');
    } finally {
      setCancelling(false);
    }
  }

  const displayDriver = booking?.driver ?? (matchedDriver ? {
    id: matchedDriver.driver.id,
    ratingAvg: matchedDriver.driver.rating,
    totalTrips: 0,
    user: {
      fullName:  matchedDriver.driver.fullName ?? 'Driver',
      phone:     matchedDriver.driver.phone    ?? '',
      avatarUrl: matchedDriver.driver.avatarUrl ?? null,
    },
  } : null);

  const displayTruck = booking?.truck ?? null;

  return (
    <>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container-page py-6 space-y-5 animate-fade-in">
        {/* Header */}
        <header className="flex items-start justify-between gap-3">
          <div>
            {booking ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{booking.referenceCode}</p>
            ) : (
              <Skeleton className="h-3 w-24 mb-1 rounded-full" />
            )}
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Live tracking</h1>
          </div>
          <StatusBadge status={liveStatus} />
        </header>

        {loadError && (
          <div className="rounded-2xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {loadError}
          </div>
        )}

        {noDriversMessage && liveStatus === 'pending' && (
          <div className="rounded-2xl border border-amber-100 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/50 px-4 py-3 text-sm text-amber-700 dark:text-amber-400 animate-slide-up">
            <p className="font-semibold">No drivers available nearby</p>
            <p className="mt-1 text-xs">{noDriversMessage} You can wait — drivers coming online will be notified automatically.</p>
          </div>
        )}

        {/* Progress stepper */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-card px-5 py-5 sm:px-6">
          <ol className="flex items-center justify-between">
            {PROGRESS.map((step, i) => {
              const reached  = stepIndex >= i;
              const isActive = stepIndex === i;
              return (
                <li key={step} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className={`grid size-7 place-items-center rounded-full text-xs font-bold transition-all ${
                      reached
                        ? isActive
                          ? 'bg-brand-600 text-white shadow-glow scale-110'
                          : 'bg-gray-800 dark:bg-white text-white dark:text-gray-900'
                        : 'border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-400 dark:text-gray-600'
                    }`}>
                      {reached && !isActive
                        ? <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"/></svg>
                        : i + 1}
                    </span>
                    <span className={`text-[10px] text-center capitalize leading-tight max-w-[48px] ${
                      reached ? 'text-gray-700 dark:text-gray-300 font-semibold' : 'text-gray-400 dark:text-gray-600'
                    }`}>
                      {step.replace('_', ' ')}
                    </span>
                  </div>
                  {i < PROGRESS.length - 1 && (
                    <span className={`mx-1 mb-4 h-0.5 flex-1 rounded-full transition-all ${
                      stepIndex > i ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Status + ETA */}
        <TripStatusCard
          phase={phase}
          isLive={isConnected}
          etaMinutes={eta?.durationMinutes ?? null}
          distanceKmRemaining={eta?.distanceKm ?? null}
          speedKmh={driverLocation?.speedKmh ?? null}
          lastUpdateAt={driverLocation ? new Date(driverLocation.at) : null}
          isSignalStale={isStale && !!smoothedDriver}
          signalAgeMs={signalAgeMs}
        />

        {displayDriver && <DriverInfoCard driver={displayDriver} truck={displayTruck} />}

        {isBiddingPhase && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Driver offers</h2>
              <span className="flex size-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {bids?.length ?? 0}
              </span>
            </div>
            <BidsList bids={bids} onAccept={acceptBid} />
          </section>
        )}

        {/* Map + Trip summary */}
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="h-[360px] sm:h-[440px] lg:h-[520px]">
            {booking && pickupCoord && dropoffCoord ? (
              <TrackingMap
                pickup={pickupCoord}
                dropoff={dropoffCoord}
                driver={
                  smoothedDriver
                    ? { lat: smoothedDriver.lat, lng: smoothedDriver.lng, heading: smoothedDriver.heading }
                    : driverLocation
                    ? { lat: driverLocation.lat, lng: driverLocation.lng, heading: driverLocation.heading }
                    : initialDriverPos
                }
                preSmoothed={!!smoothedDriver}
                isSignalStale={isStale && !!smoothedDriver}
                phase={phase}
                nearbyDrivers={phase === 'searching' ? nearbyDrivers : undefined}
                followDriver
                className="h-full rounded-2xl overflow-hidden"
              />
            ) : (
              <div className="grid h-full place-items-center rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                {booking ? (
                  <span className="text-sm text-gray-400 dark:text-gray-500">No route coordinates available</span>
                ) : (
                  <div className="space-y-2 text-center">
                    <div className="grid size-12 place-items-center rounded-2xl bg-gray-200 dark:bg-gray-700 text-2xl mx-auto animate-pulse">🗺</div>
                    <span className="text-sm text-gray-400 dark:text-gray-500">Loading map…</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Trip summary */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-card overflow-hidden">
            <div className="px-5 pt-5 pb-3 sm:px-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Trip summary</h2>
            </div>
            <div className="px-5 pb-5 sm:px-6 space-y-3 text-sm">
              {booking ? (
                <>
                  <SummaryRow label="Pickup"   value={booking.pickupAddress} />
                  <SummaryRow label="Drop-off" value={booking.dropoffAddress} />

                  <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Vehicle</span>
                      <span className="font-semibold capitalize text-gray-900 dark:text-white">{booking.vehicleType.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Distance</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {booking.distanceKm ? `${Number(booking.distanceKm).toFixed(1)} km` : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-3 text-base">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {booking.finalFare ? 'Final fare' : 'Estimated fare'}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {booking.finalFare
                        ? formatCurrency(Number(booking.finalFare))
                        : booking.estimatedFare
                        ? formatCurrency(Number(booking.estimatedFare))
                        : '—'}
                    </span>
                  </div>

                  {['pending', 'accepted'].includes(booking.status) && (
                    <Button variant="danger" size="sm" className="mt-2 w-full" isLoading={cancelling} onClick={cancel}>
                      Cancel booking
                    </Button>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-12 rounded-full" />
                    <Skeleton className="h-4 w-full rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-14 rounded-full" />
                    <Skeleton className="h-4 w-full rounded-xl" />
                  </div>
                  <Skeleton className="h-px w-full my-1" />
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-16 rounded-xl" />
                    <Skeleton className="h-4 w-16 rounded-xl" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    {showRating && booking && (
      <RatingModal
        bookingId={booking.id}
        revieweeName={booking.driver?.user.fullName ?? 'your driver'}
        onDone={() => setShowRating(false)}
      />
    )}
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-400 dark:text-gray-500 font-medium">{label}</div>
      <div className="mt-0.5 font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}
