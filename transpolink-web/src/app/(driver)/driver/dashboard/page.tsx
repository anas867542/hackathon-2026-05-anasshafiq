'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/status/StatusBadge';
import { SubmitBidModal } from '@/components/driver/SubmitBidModal';
import { driversApi, DriverProfile } from '@/lib/api/drivers';
import { bookingsApi, Booking } from '@/lib/api/bookings';
import { useDriverInbox, InboxItem } from '@/hooks/useDriverInbox';
import { useAuth } from '@/hooks/useAuth';
import { session } from '@/lib/auth/session';
import { formatCurrency } from '@/lib/utils';
import { ApiError } from '@/lib/api/client';

export default function DriverDashboardPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const token = hydrated ? session.getAccessToken() : null;

  const [profile,  setProfile]  = useState<DriverProfile | null>(null);
  const [active,   setActive]   = useState<Booking | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [busy,     setBusy]     = useState(false);
  const [locating, setLocating] = useState(false);
  const [bidTarget, setBidTarget] = useState<InboxItem | null>(null);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  const { inbox, remove, markBidSubmitted, winner, clearWinner } = useDriverInbox(token);

  useEffect(() => {
    if (!winner) return;
    clearWinner();
    router.push(`/driver/trip/${winner.bookingId}`);
  }, [winner, clearWinner, router]);

  useEffect(() => {
    driversApi.me().then(setProfile).catch((e) => setError((e as Error).message));
    bookingsApi.list({ pageSize: 5 }).then((res) =>
      setActive(res.items.find((b) => ['accepted', 'arrived', 'in_progress'].includes(b.status)) ?? null),
    );
  }, []);

  async function toggleOnline() {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const goingOnline = profile.status !== 'online';
      let lat: number | undefined;
      let lng: number | undefined;
      if (goingOnline) {
        if (!navigator.geolocation) throw new Error('Geolocation not supported.');
        try {
          const pos = await getPosition();
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch (geoErr) {
          const code = (geoErr as GeolocationPositionError)?.code;
          throw new Error(
            code === 1 ? 'Location permission denied. Allow it in your browser settings.'
            : code === 2 ? 'Could not determine your location.'
            : 'Location request timed out.',
          );
        }
      }
      const updated = await driversApi.setAvailability(goingOnline ? 'online' : 'offline', lat, lng);
      setProfile({ ...profile, status: updated.status,
        currentLat: (lat ?? profile.currentLat) as DriverProfile['currentLat'],
        currentLng: (lng ?? profile.currentLng) as DriverProfile['currentLng'],
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function refreshLocation() {
    if (!profile || profile.status !== 'online') return;
    setLocating(true);
    setError(null);
    try {
      const pos = await getPosition();
      await driversApi.setAvailability('online', pos.coords.latitude, pos.coords.longitude);
      setProfile({ ...profile, currentLat: pos.coords.latitude as DriverProfile['currentLat'], currentLng: pos.coords.longitude as DriverProfile['currentLng'] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLocating(false);
    }
  }

  async function accept(bookingId: string) {
    setBusy(true);
    try {
      const truckId = profile?.trucks.find((t) => t.isPrimary)?.id;
      const booking = await bookingsApi.accept(bookingId, truckId);
      remove(bookingId);
      setActive(booking);
      router.push(`/driver/trip/${booking.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to accept');
    } finally {
      setBusy(false);
    }
  }

  const isOnline = profile?.status === 'online';

  return (
    <div className="min-h-screen bg-whisper">
      {/* ── Status hero ──────────────────────────────────────────────────── */}
      <div className={`px-4 pt-10 pb-20 sm:px-6 md:rounded-b-3xl transition-colors duration-500 ${
        isOnline
          ? 'bg-gradient-to-br from-brand-600 to-brand-800'
          : 'bg-gradient-to-br from-gray-700 to-gray-900'
      }`}>
        <div className="mx-auto max-w-2xl">
          {/* Driver name */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${isOnline ? 'text-brand-200' : 'text-gray-400'}`}>
                Driver
              </p>
              <h1 className="mt-0.5 text-xl font-bold text-white">
                {profile?.user.fullName ?? <Skeleton className="inline-block h-6 w-40 bg-white/20" />}
              </h1>
            </div>

            {/* Online/offline toggle */}
            <div className="flex flex-col items-end gap-2">
              <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                isOnline ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-gray-400'
              }`}>
                <span className={`size-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                {profile ? (isOnline ? 'Online' : 'Offline') : '…'}
              </div>
              <Button
                onClick={toggleOnline}
                isLoading={busy}
                variant={isOnline ? 'secondary' : 'brand'}
                size="sm"
                className={isOnline ? '' : 'bg-white text-brand-700 hover:bg-white/90 border-white'}
              >
                {isOnline ? 'Go offline' : 'Go online'}
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {profile === null ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white/10 p-3 space-y-1.5">
                  <Skeleton className="h-3 w-12 bg-white/20 rounded-full" />
                  <Skeleton className="h-5 w-16 bg-white/20 rounded-xl" />
                </div>
              ))
            ) : (
              [
                { label: 'Trips',    value: profile.totalTrips.toString() },
                { label: 'Rating',   value: `${Number(profile.ratingAvg).toFixed(1)} ★` },
                { label: 'Earned',   value: formatCurrency(Number(profile.totalEarnings)), small: true },
              ].map(({ label, value, small }) => (
                <div key={label} className="rounded-2xl bg-white/10 px-3 py-3">
                  <p className={`text-xs font-medium ${isOnline ? 'text-brand-200' : 'text-gray-400'}`}>{label}</p>
                  <p className={`mt-1 font-bold text-white ${small ? 'text-sm' : 'text-lg'}`}>{value}</p>
                </div>
              ))
            )}
          </div>

          {/* Location status */}
          {isOnline && profile?.currentLat != null && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-brand-200">
                📍 {Number(profile.currentLat).toFixed(4)}, {Number(profile.currentLng).toFixed(4)}
              </p>
              <button
                onClick={refreshLocation}
                disabled={locating || busy}
                className="text-xs text-brand-200 hover:text-white underline underline-offset-2 disabled:opacity-50"
              >
                {locating ? 'Updating…' : 'Refresh location'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="-mt-10 px-4 pb-8 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-5">

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 animate-slide-up">
              {error}
            </div>
          )}

          {isOnline && !profile?.currentLat && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700 animate-slide-up">
              <p className="font-semibold">Location missing</p>
              <p className="mt-0.5 text-xs">Click &quot;Refresh location&quot; or toggle offline → online.</p>
            </div>
          )}

          {/* ── Active trip ────────────────────────────────────────────── */}
          {active && (
            <Card elevated className="border-brand-200 overflow-hidden animate-slide-up">
              <div className="bg-brand-600 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-white animate-pulse" aria-hidden />
                  <p className="text-xs font-semibold text-white uppercase tracking-wide">Active trip</p>
                </div>
                <StatusBadge status={active.status} />
              </div>
              <CardBody className="space-y-4 pt-4">
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-gray-400 font-medium">Pickup</div>
                    <div className="mt-0.5 font-semibold text-gray-900">{active.pickupAddress}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 font-medium">Drop-off</div>
                    <div className="mt-0.5 font-semibold text-gray-900">{active.dropoffAddress}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {active.status === 'accepted' && (
                    <Button size="sm" variant="secondary"
                      onClick={async () => setActive(await bookingsApi.arrive(active.id))}>
                      Mark arrived
                    </Button>
                  )}
                  {active.status === 'arrived' && (
                    <Button size="sm" variant="brand"
                      onClick={async () => setActive(await bookingsApi.start(active.id))}>
                      Start trip
                    </Button>
                  )}
                  {active.status === 'in_progress' && (
                    <Button size="sm" variant="brand"
                      onClick={async () => { await bookingsApi.complete(active.id); router.push('/driver/dashboard'); }}>
                      Complete trip
                    </Button>
                  )}
                  <Link href={`/driver/trip/${active.id}`}>
                    <Button size="sm" variant="ghost">Live tracker →</Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          )}

          {/* ── Incoming requests ─────────────────────────────────────── */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Incoming requests</h2>
              {inbox.length > 0 && (
                <span className="flex size-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {inbox.length}
                </span>
              )}
            </div>

            {inbox.length === 0 ? (
              <Card elevated>
                <CardBody className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 relative">
                    <div className="grid size-16 place-items-center rounded-2xl bg-gray-100 text-3xl">
                      {isOnline ? '📡' : '💤'}
                    </div>
                    {isOnline && (
                      <>
                        <span className="absolute inset-0 rounded-2xl bg-brand-400/20 animate-ping" />
                      </>
                    )}
                  </div>
                  <p className="font-semibold text-gray-700">
                    {isOnline ? 'Listening for bookings…' : 'You are offline'}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    {isOnline
                      ? 'New requests near you will appear here instantly.'
                      : 'Go online to start receiving booking requests.'}
                  </p>
                  {!isOnline && (
                    <Button variant="brand" size="sm" className="mt-5" onClick={toggleOnline} isLoading={busy}>
                      Go online
                    </Button>
                  )}
                </CardBody>
              </Card>
            ) : (
              <ul className="space-y-3">
                {inbox.map((o) => {
                  const expiresMs   = new Date(o.expiresAt).getTime();
                  const totalMs     = 30_000;
                  const remainingMs = Math.max(0, expiresMs - now);
                  const secondsLeft = Math.ceil(remainingMs / 1000);
                  const pct         = Math.min(100, (remainingMs / totalMs) * 100);
                  const isBidding   = o.bookingType === 'bidding';
                  const isUrgent    = secondsLeft <= 10;

                  return (
                    <li key={o.bookingId} className="animate-slide-up">
                      <Card elevated>
                        <CardBody className="pt-5 space-y-4">
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900">{o.referenceCode}</div>
                              <div className="text-xs text-gray-500 capitalize">
                                {o.vehicleType.replace('_', ' ')}{isBidding ? ' · bidding' : ''}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {isBidding && <Badge tone="brand">Bid</Badge>}
                              <Badge tone={isUrgent ? 'danger' : 'warning'} className="font-mono tabular-nums">
                                {secondsLeft}s
                              </Badge>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isUrgent ? 'bg-red-500' : 'bg-amber-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          {/* Route */}
                          <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2.5">
                              <span className="mt-1 size-2 shrink-0 rounded-full bg-brand-600" aria-hidden />
                              <span className="text-gray-700 text-xs leading-relaxed">{o.pickup.address}</span>
                            </div>
                            <div className="flex items-start gap-2.5">
                              <span className="mt-1 size-2 shrink-0 rounded-full bg-red-500" aria-hidden />
                              <span className="text-gray-700 text-xs leading-relaxed">{o.dropoff.address}</span>
                            </div>
                          </div>

                          {/* Fare */}
                          <div className="flex items-center justify-between rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
                            <span className="text-sm text-gray-500">{o.distanceKm.toFixed(1)} km</span>
                            <span className="text-base font-bold text-gray-900">
                              {formatCurrency(o.estimatedFare)}
                              {isBidding && <span className="ml-1 text-xs font-normal text-gray-400">ref</span>}
                            </span>
                          </div>

                          {/* Actions */}
                          {o.bidSubmitted ? (
                            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">
                              <span className="text-base">✓</span>
                              Bid submitted — waiting for customer
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              {isBidding ? (
                                <Button size="md" variant="brand" className="flex-1" onClick={() => setBidTarget(o)}>
                                  Submit offer
                                </Button>
                              ) : (
                                <Button size="md" variant="brand" className="flex-1"
                                  onClick={() => accept(o.bookingId)} isLoading={busy}>
                                  Accept
                                </Button>
                              )}
                              <Button size="md" variant="secondary" onClick={() => remove(o.bookingId)}>
                                Skip
                              </Button>
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ── My trucks ─────────────────────────────────────────────── */}
          <section>
            <h2 className="mb-3 text-base font-bold text-gray-900">My trucks</h2>
            <Card elevated className="overflow-hidden">
              {profile ? (
                profile.trucks.length === 0 ? (
                  <CardBody className="py-10 text-center">
                    <p className="text-sm text-gray-500">No trucks registered yet.</p>
                  </CardBody>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {profile.trucks.map((t) => (
                      <li key={t.id} className="flex items-center justify-between px-5 py-4">
                        <div>
                          <div className="font-semibold text-gray-900">{t.plateNumber}</div>
                          <div className="mt-0.5 text-xs text-gray-400 capitalize">
                            {t.type.replace('_', ' ')} · {t.capacityKg} kg
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {t.isPrimary && <Badge tone="brand">Primary</Badge>}
                          <Badge tone={t.isActive ? 'success' : 'neutral'}>
                            {t.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <CardBody className="space-y-3 py-5">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24 rounded-xl" />
                        <Skeleton className="h-3 w-32 rounded-xl" />
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  ))}
                </CardBody>
              )}
            </Card>
          </section>
        </div>
      </div>

      {bidTarget && (
        <SubmitBidModal
          request={bidTarget}
          onClose={() => setBidTarget(null)}
          onSubmitted={() => { markBidSubmitted(bidTarget.bookingId); setBidTarget(null); }}
        />
      )}
    </div>
  );
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10_000 }),
  );
}
