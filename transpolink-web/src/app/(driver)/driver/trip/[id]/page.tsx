'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
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

const PHASE_META: Record<string, { label: string; icon: string; hint: string }> = {
  searching:  { label: 'Searching for booking…',     icon: '🔍', hint: '' },
  to_pickup:  { label: 'Head to pickup location',    icon: '🧭', hint: 'Follow navigation to collect the goods.' },
  at_pickup:  { label: 'Arrived at pickup',          icon: '📦', hint: 'Load the goods and tap Start trip when ready.' },
  to_dropoff: { label: 'En route to drop-off',       icon: '🚛', hint: 'Drive to the destination. GPS is streaming.' },
  completed:  { label: 'Trip completed',             icon: '✅', hint: 'Great job! Awaiting customer review.' },
  cancelled:  { label: 'Trip cancelled',             icon: '✕',  hint: 'This booking was cancelled.' },
};

export default function DriverTripPage() {
  const params     = useParams<{ id: string }>();
  const router     = useRouter();
  const bookingId  = params.id;
  const { hydrated } = useAuth();
  const token = hydrated ? session.getAccessToken() : null;

  const [booking, setBooking]   = useState<Booking | null>(null);
  const [error, setError]       = useState<string | null>(null);
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
  const phaseMeta = PHASE_META[phase] ?? { label: 'Waiting…', icon: '⏳', hint: '' };

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

  // Use driver's DB position as seed until device GPS fires
  const initialDriverPos = useMemo(() => {
    if (!booking?.driver) return null;
    const lat = Number(booking.driver.currentLat);
    const lng = Number(booking.driver.currentLng);
    return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)
      ? { lat, lng } : null;
  }, [booking?.driver?.currentLat, booking?.driver?.currentLng]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveDriverPos = currentPosition ?? initialDriverPos ?? undefined;

  async function transition(action: 'arrive' | 'start' | 'complete') {
    if (!booking) return;
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
  }

  return (
    <>
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div>
          {booking ? (
            <p className="text-xs text-zinc-400">{booking.referenceCode}</p>
          ) : (
            <Skeleton className="h-3 w-24 mb-1" />
          )}
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Live trip</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={isStreaming ? 'success' : 'neutral'} size="md">
            <span className={`mr-1.5 inline-block size-1.5 rounded-full ${isStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} aria-hidden />
            {isStreaming ? 'GPS live' : 'GPS off'}
          </Badge>
          <StatusBadge status={effectiveStatus} />
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Cancellation banner */}
      {cancellation && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 animate-slide-up">
          <p className="font-semibold">Booking cancelled</p>
          {cancellation.reason && <p className="mt-1 text-xs">Reason: {cancellation.reason}</p>}
          {cancellation.cancelledBy && (
            <p className="mt-0.5 text-xs capitalize">Cancelled by: {cancellation.cancelledBy}</p>
          )}
        </div>
      )}

      {lastError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          GPS issue: {lastError}
        </div>
      )}

      {/* Phase banner */}
      <Card className="border-brand-200 bg-brand-50/30">
        <CardBody className="flex items-center gap-4 py-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-soft">
            {phaseMeta.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-600">Next step</p>
            <p className="mt-0.5 text-base font-semibold text-zinc-900">{phaseMeta.label}</p>
            {phaseMeta.hint && (
              <p className="mt-0.5 text-xs text-zinc-500">{phaseMeta.hint}</p>
            )}
            {currentPosition && (
              <p className="mt-1 text-xs text-zinc-400">
                {currentPosition.lat.toFixed(4)}, {currentPosition.lng.toFixed(4)}
                {currentPosition.speedKmh != null && ` · ${currentPosition.speedKmh.toFixed(0)} km/h`}
              </p>
            )}
          </div>
        </CardBody>
      </Card>

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
          <div className="grid h-full place-items-center rounded-2xl border border-zinc-200 bg-zinc-50">
            <div className="space-y-2 text-center">
              <div className="grid size-10 place-items-center rounded-xl bg-zinc-200 text-xl mx-auto animate-pulse">🗺</div>
              <span className="text-sm text-zinc-400">Loading map…</span>
            </div>
          </div>
        )}
      </div>

      {/* Trip details + Actions */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* Trip details */}
        <Card>
          <CardHeader>
            <CardTitle>Trip details</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            {booking ? (
              <>
                <div>
                  <div className="text-xs text-zinc-500">Pickup</div>
                  <div className="mt-0.5 font-medium text-zinc-900">{booking.pickupAddress}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Drop-off</div>
                  <div className="mt-0.5 font-medium text-zinc-900">{booking.dropoffAddress}</div>
                </div>
                {booking.goodsDescription && (
                  <div className="border-t border-zinc-100 pt-3">
                    <div className="text-xs text-zinc-500">Goods</div>
                    <div className="mt-0.5 text-zinc-700">{booking.goodsDescription}</div>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-base">
                  <span className="font-medium text-zinc-900">Fare</span>
                  <span className="font-bold text-zinc-900">
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
          </CardBody>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Trip actions</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {effectiveStatus === 'accepted' && (
              <Button variant="brand" className="w-full" onClick={() => transition('arrive')}>
                Mark arrived at pickup
              </Button>
            )}
            {effectiveStatus === 'arrived' && (
              <Button variant="brand" className="w-full" onClick={() => transition('start')}>
                Start trip
              </Button>
            )}
            {effectiveStatus === 'in_progress' && (
              <Button variant="brand" className="w-full" onClick={() => transition('complete')}>
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

            <div className="rounded-xl bg-zinc-50 px-3 py-2.5 text-xs text-zinc-500">
              <div className="flex justify-between">
                <span>GPS status</span>
                <span className={isStreaming ? 'text-emerald-600 font-medium' : 'text-zinc-400'}>
                  {isStreaming ? 'Streaming' : 'Idle'}
                </span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Last update</span>
                <span>
                  {lastSentAt
                    ? lastSentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : '—'}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
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
