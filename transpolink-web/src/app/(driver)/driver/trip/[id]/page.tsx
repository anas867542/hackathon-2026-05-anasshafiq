'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/status/StatusBadge';
import { TrackingMap } from '@/components/map/TrackingMap';
import { useDriverTracking } from '@/hooks/useDriverTracking';
import { useDriverTripStatus } from '@/hooks/useDriverTripStatus';
import { useAuth } from '@/hooks/useAuth';
import { bookingsApi, Booking } from '@/lib/api/bookings';
import { reviewsApi } from '@/lib/api/reviews';
import { session } from '@/lib/auth/session';
import { formatCurrency } from '@/lib/utils';
import { getTripPhase } from '@/lib/booking/phase';
import { RatingModal } from '@/components/booking/RatingModal';

const PHASE_META: Record<string, { label: string; icon: string; hint: string; color: string }> = {
  searching:  { label: 'Searching for booking…',     icon: '🔍', hint: '',                                                    color: 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700' },
  to_pickup:  { label: 'Head to pickup location',    icon: '🧭', hint: 'Follow navigation to collect the goods.',             color: 'bg-brand-50 dark:bg-brand-950/40 border-brand-200 dark:border-brand-800' },
  at_pickup:  { label: 'Arrived at pickup',          icon: '📦', hint: 'Load the goods and tap Start trip when ready.',       color: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
  to_dropoff: { label: 'En route to drop-off',       icon: '🚛', hint: 'Drive to the destination. GPS is streaming.',         color: 'bg-brand-50 dark:bg-brand-950/40 border-brand-200 dark:border-brand-800' },
  completed:  { label: 'Trip completed',             icon: '✅', hint: 'Great job! Awaiting customer review.',                color: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
  cancelled:  { label: 'Trip cancelled',             icon: '✕',  hint: 'This booking was cancelled.',                         color: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800' },
};

export default function DriverTripPage() {
  const params     = useParams<{ id: string }>();
  const router     = useRouter();
  const bookingId  = params.id;
  const { hydrated } = useAuth();
  const token = hydrated ? session.getAccessToken() : null;

  const [booking, setBooking]   = useState<Booking | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [enabled, setEnabled]   = useState(true);
  const [showRating, setShowRating] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    bookingsApi.get(bookingId).then(setBooking).catch((e) => setError((e as Error).message));
  }, [bookingId]);

  const { liveStatus, cancellation } = useDriverTripStatus(bookingId, token);
  const effectiveStatus = liveStatus ?? booking?.status ?? null;

  const streamingEligible =
    effectiveStatus != null && ['accepted', 'arrived', 'in_progress'].includes(effectiveStatus);

  const { isStreaming, lastSentAt, lastError, currentPosition } = useDriverTracking({
    bookingId,
    token,
    intervalMs: 2000,
    enabled: enabled && streamingEligible,
  });

  const phase = getTripPhase(effectiveStatus);
  const phaseMeta = PHASE_META[phase] ?? { label: 'Waiting…', icon: '⏳', hint: '', color: 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700' };

  const pickupCoord = useMemo(() => {
    if (!booking) return null;
    const lat = Number(booking.pickupLat);
    const lng = Number(booking.pickupLng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }, [booking]);

  const dropoffCoord = useMemo(() => {
    if (!booking) return null;
    const lat = Number(booking.dropoffLat);
    const lng = Number(booking.dropoffLng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }, [booking]);

  const initialDriverPos = useMemo(() => {
    if (!booking?.driver) return null;
    const lat = Number(booking.driver.currentLat);
    const lng = Number(booking.driver.currentLng);
    return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)
      ? { lat, lng } : null;
  }, [booking?.driver?.currentLat, booking?.driver?.currentLng]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveDriverPos = currentPosition ?? initialDriverPos ?? undefined;

  async function transition(action: 'arrive' | 'start' | 'complete') {
    if (!booking || transitioning) return;
    setTransitioning(true);
    setError(null);
    try {
      const updated = await bookingsApi[action](booking.id);
      setBooking(updated);
      if (action === 'complete') {
        reviewsApi.hasReviewed(booking.id)
          .then(({ reviewed }) => {
            if (!reviewed) setShowRating(true);
            else router.replace('/driver/dashboard');
          })
          .catch(() => router.replace('/driver/dashboard'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed. Please try again.');
    } finally {
      setTransitioning(false);
    }
  }

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
              <Skeleton className="h-3 w-24 mb-1" />
            )}
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Live trip</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={isStreaming ? 'success' : 'neutral'} size="md">
              <span className={`mr-1.5 inline-block size-1.5 rounded-full ${isStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} aria-hidden />
              {isStreaming ? 'GPS live' : 'GPS off'}
            </Badge>
            <StatusBadge status={effectiveStatus} />
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {cancellation && (
          <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-800 dark:text-red-400 animate-slide-up">
            <p className="font-semibold">Booking cancelled</p>
            {cancellation.reason && <p className="mt-1 text-xs">Reason: {cancellation.reason}</p>}
            {cancellation.cancelledBy && (
              <p className="mt-0.5 text-xs capitalize">Cancelled by: {cancellation.cancelledBy}</p>
            )}
          </div>
        )}

        {lastError && (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/50 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
            GPS issue: {lastError}
          </div>
        )}

        {/* Phase banner */}
        <div className={`rounded-2xl border ${phaseMeta.color} px-5 py-4 flex items-center gap-4`}>
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white dark:bg-gray-900 text-2xl shadow-soft">
            {phaseMeta.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">Next step</p>
            <p className="mt-0.5 text-base font-bold text-gray-900 dark:text-white">{phaseMeta.label}</p>
            {phaseMeta.hint && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{phaseMeta.hint}</p>
            )}
            {currentPosition && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {currentPosition.lat.toFixed(4)}, {currentPosition.lng.toFixed(4)}
                {currentPosition.speedKmh != null && ` · ${currentPosition.speedKmh.toFixed(0)} km/h`}
              </p>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="h-[360px] sm:h-[440px]">
          {pickupCoord && dropoffCoord ? (
            <TrackingMap
              pickup={pickupCoord}
              dropoff={dropoffCoord}
              driver={effectiveDriverPos}
              phase={phase}
              followDriver
              className="h-full rounded-2xl overflow-hidden"
            />
          ) : (
            <div className="grid h-full place-items-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="space-y-2 text-center">
                <div className="grid size-10 place-items-center rounded-xl bg-gray-200 dark:bg-gray-700 text-xl mx-auto animate-pulse">🗺</div>
                <span className="text-sm text-gray-400 dark:text-gray-500">Loading map…</span>
              </div>
            </div>
          )}
        </div>

        {/* Trip details + Actions */}
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          {/* Trip details */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-card">
            <div className="px-5 pt-5 pb-3 sm:px-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Trip details</h2>
            </div>
            <div className="px-5 pb-5 sm:px-6 space-y-3 text-sm">
              {booking ? (
                <>
                  <div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 font-medium">Pickup</div>
                    <div className="mt-0.5 font-semibold text-gray-900 dark:text-white">{booking.pickupAddress}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 font-medium">Drop-off</div>
                    <div className="mt-0.5 font-semibold text-gray-900 dark:text-white">{booking.dropoffAddress}</div>
                  </div>
                  {booking.goodsDescription && (
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                      <div className="text-xs text-gray-400 dark:text-gray-500 font-medium">Goods</div>
                      <div className="mt-0.5 text-gray-700 dark:text-gray-300">{booking.goodsDescription}</div>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
                    <span className="font-semibold text-gray-900 dark:text-white">Fare</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(Number(booking.finalFare ?? booking.estimatedFare ?? 0))}
                    </span>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5"><Skeleton className="h-3 w-12" /><Skeleton className="h-4 w-full" /></div>
                  <div className="space-y-1.5"><Skeleton className="h-3 w-14" /><Skeleton className="h-4 w-full" /></div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-card">
            <div className="px-5 pt-5 pb-3 sm:px-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Trip actions</h2>
            </div>
            <div className="px-5 pb-5 sm:px-6 space-y-3">
              {effectiveStatus === 'accepted' && (
                <Button variant="brand" className="w-full" isLoading={transitioning} onClick={() => transition('arrive')}>
                  Mark arrived at pickup
                </Button>
              )}
              {effectiveStatus === 'arrived' && (
                <Button variant="brand" className="w-full" isLoading={transitioning} onClick={() => transition('start')}>
                  Start trip
                </Button>
              )}
              {effectiveStatus === 'in_progress' && (
                <Button variant="brand" className="w-full" isLoading={transitioning} onClick={() => transition('complete')}>
                  Complete trip
                </Button>
              )}

              <Button
                className="w-full"
                variant={enabled ? 'secondary' : 'ghost'}
                onClick={() => setEnabled((v) => !v)}
                disabled={!streamingEligible}
              >
                {enabled ? 'Pause GPS sharing' : 'Resume GPS sharing'}
              </Button>

              <div className="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>GPS status</span>
                  <span className={isStreaming ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-gray-400 dark:text-gray-600'}>
                    {isStreaming ? 'Streaming' : 'Idle'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last update</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {lastSentAt
                      ? lastSentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {showRating && booking && (
      <RatingModal
        bookingId={booking.id}
        revieweeName="the customer"
        onDone={() => router.replace('/driver/dashboard')}
      />
    )}
    </>
  );
}
