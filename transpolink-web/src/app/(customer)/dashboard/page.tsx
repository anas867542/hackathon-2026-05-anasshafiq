'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/status/StatusBadge';
import { bookingsApi, Booking } from '@/lib/api/bookings';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatRelative } from '@/lib/utils';

export default function CustomerDashboardPage() {
  const { user }  = useAuth();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    bookingsApi
      .list({ pageSize: 10 })
      .then((res) => setBookings(res.items))
      .catch((e) => setError((e as Error).message));
  }, []);

  const { active, completedCount, totalSpent, cancelledCount } = useMemo(() => {
    if (!bookings) return { active: undefined, completedCount: 0, totalSpent: null, cancelledCount: 0 };
    const ACTIVE = new Set(['pending', 'matched', 'accepted', 'arrived', 'in_progress']);
    let active: Booking | undefined;
    let completedCount = 0;
    let totalSpent     = 0;
    let cancelledCount = 0;
    for (const b of bookings) {
      if (!active && ACTIVE.has(b.status)) active = b;
      if (b.status === 'completed') { completedCount++; totalSpent += Number(b.finalFare ?? b.estimatedFare ?? 0); }
      if (b.status === 'cancelled') cancelledCount++;
    }
    return { active, completedCount, totalSpent, cancelledCount };
  }, [bookings]);

  const firstName = user?.email?.split('@')[0] ?? '';

  return (
    <div className="min-h-screen bg-whisper">
      {/* ── Hero banner ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-800 px-4 pt-12 pb-20 sm:px-6 md:rounded-b-3xl">
        <div className="mx-auto max-w-2xl">
          <p className="text-brand-200 text-sm font-medium">Welcome back 👋</p>
          <h1 className="mt-1 text-2xl font-bold text-white capitalize">
            {firstName || <Skeleton className="inline-block h-7 w-32 bg-brand-700" />}
          </h1>
          <p className="mt-1 text-brand-200 text-sm">Ready to book your next shipment?</p>

          <Link href="/book" className="mt-6 inline-block">
            <Button variant="secondary" size="lg" className="shadow-glow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              Book a truck
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Content offset up into the hero ──────────────────────────────── */}
      <div className="-mt-10 px-4 pb-8 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-5">

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 animate-slide-up">
              {error}
            </div>
          )}

          {/* ── Active trip card ─────────────────────────────────────────── */}
          {active && (
            <div className="animate-slide-up">
              <Card elevated className="border-brand-200 overflow-hidden">
                <div className="bg-brand-600 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-white animate-pulse" aria-hidden />
                    <p className="text-xs font-semibold text-white uppercase tracking-wide">Active booking</p>
                  </div>
                  <StatusBadge status={active.status} />
                </div>
                <CardBody className="space-y-4 pt-4">
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    {[
                      { label: 'Pickup',         value: active.pickupAddress },
                      { label: 'Drop-off',        value: active.dropoffAddress },
                      { label: 'Vehicle',         value: active.vehicleType.replace('_', ' '), cap: true },
                      { label: 'Estimated fare',  value: active.estimatedFare ? formatCurrency(Number(active.estimatedFare)) : '—' },
                    ].map(({ label, value, cap }) => (
                      <div key={label}>
                        <div className="text-xs text-gray-400 font-medium">{label}</div>
                        <div className={`mt-0.5 text-sm font-semibold text-gray-900 ${cap ? 'capitalize' : ''}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <Link href={`/book/${active.id}`} className="block">
                    <Button variant="brand" size="sm" className="w-full sm:w-auto">
                      Open live tracker →
                    </Button>
                  </Link>
                </CardBody>
              </Card>
            </div>
          )}

          {/* ── Stats row ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            {bookings === null ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} elevated>
                  <CardBody className="py-4 space-y-2">
                    <Skeleton className="h-3 w-12 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-xl" />
                  </CardBody>
                </Card>
              ))
            ) : (
              [
                { label: 'Total',     value: bookings.length.toString(),   color: 'text-gray-900' },
                { label: 'Done',      value: completedCount.toString(),     color: 'text-emerald-600' },
                { label: 'Spent',     value: totalSpent !== null ? formatCurrency(totalSpent) : '—', color: 'text-brand-600', small: true },
              ].map(({ label, value, color, small }) => (
                <Card key={label} elevated>
                  <CardBody className="py-4">
                    <p className="text-xs text-gray-400 font-medium">{label}</p>
                    <p className={`mt-1 font-bold tracking-tight ${color} ${small ? 'text-base' : 'text-xl'}`}>
                      {value}
                    </p>
                  </CardBody>
                </Card>
              ))
            )}
          </div>

          {/* ── Bookings list ─────────────────────────────────────────────── */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Recent bookings</h2>
            </div>

            <Card elevated className="overflow-hidden">
              {bookings === null ? (
                <ul className="divide-y divide-gray-50">
                  {[1, 2, 3].map((i) => (
                    <li key={i} className="flex items-center justify-between px-5 py-4">
                      <div className="space-y-2 flex-1 mr-8">
                        <Skeleton className="h-4 w-28 rounded-xl" />
                        <Skeleton className="h-3 w-48 rounded-xl" />
                      </div>
                      <Skeleton className="h-8 w-16 rounded-2xl" />
                    </li>
                  ))}
                </ul>
              ) : bookings.length === 0 ? (
                <CardBody className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-gray-100 text-3xl">
                    📦
                  </div>
                  <p className="font-semibold text-gray-700">No bookings yet</p>
                  <p className="mt-1 text-sm text-gray-400">Your completed trips will appear here.</p>
                  <Link href="/book" className="mt-5">
                    <Button variant="brand" size="sm">Create your first booking</Button>
                  </Link>
                </CardBody>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {bookings.map((b) => (
                    <li key={b.id}>
                      <Link
                        href={`/book/${b.id}`}
                        className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-gray-50/70 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">{b.referenceCode}</span>
                            <StatusBadge status={b.status} />
                          </div>
                          <p className="mt-0.5 truncate text-xs text-gray-400 max-w-xs">
                            {b.pickupAddress} → {b.dropoffAddress}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right text-sm">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(Number(b.finalFare ?? b.estimatedFare ?? 0))}
                            </div>
                            <div className="text-xs text-gray-400">{formatRelative(b.createdAt)}</div>
                          </div>
                          <span className="text-gray-300">›</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
