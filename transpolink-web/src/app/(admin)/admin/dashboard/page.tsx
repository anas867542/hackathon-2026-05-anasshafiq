'use client';

import { useEffect, useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MapPlaceholder } from '@/components/dashboard/MapPlaceholder';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/status/StatusBadge';
import { bookingsApi, Booking, BookingStatus } from '@/lib/api/bookings';
import { ApiError } from '@/lib/api/client';
import { formatCurrency, formatRelative } from '@/lib/utils';

const STATUS_FILTERS: { label: string; value: BookingStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: 'pending' },
  { label: 'Active', value: 'accepted' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const PAGE_SIZE = 15;

export default function AdminDashboardPage() {
  const { track } = useAnalytics();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatus] = useState<BookingStatus | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track('dashboard_viewed', { section: 'admin_overview' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    setBookings(null);
    bookingsApi
      .list({ status: statusFilter, page, pageSize: PAGE_SIZE })
      .then((res) => { setBookings(res.items); setTotal(res.total); })
      .catch((e) => setError((e as Error).message));
  }, [statusFilter, page]);

  async function cancelBooking(id: string) {
    setCancelling(id);
    try {
      const updated = await bookingsApi.cancel(id, 'Cancelled by admin');
      setBookings((prev) => prev?.map((b) => (b.id === id ? updated : b)) ?? null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to cancel booking');
    } finally {
      setCancelling(null);
    }
  }

  const counts = bookings
    ? {
        pending:   bookings.filter((b) => b.status === 'pending').length,
        active:    bookings.filter((b) => ['accepted', 'arrived', 'in_progress'].includes(b.status)).length,
        completed: bookings.filter((b) => b.status === 'completed').length,
        cancelled: bookings.filter((b) => b.status === 'cancelled').length,
      }
    : null;

  const fleetStats = bookings
    ? {
        inTransit:  bookings.filter((b) => b.status === 'in_progress').length,
        arriving:   bookings.filter((b) => b.status === 'arrived').length,
        pending:    bookings.filter((b) => b.status === 'accepted').length,
      }
    : null;

  const todayRevenue = bookings
    ? bookings
        .filter((b) => b.status === 'completed')
        .reduce((sum, b) => sum + Number(b.finalFare ?? b.estimatedFare ?? 0), 0)
    : null;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <DashboardHeader title="Dashboard" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {counts === null ? (
            Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard
                label="Total bookings"
                value={total.toString()}
                delta={`${counts.pending} pending`}
                deltaPositive={counts.pending === 0}
                icon="📦"
                color="brand"
              />
              <KpiCard
                label="Active trips"
                value={counts.active.toString()}
                delta="Live right now"
                deltaPositive
                icon="🚛"
                color="teal"
              />
              <KpiCard
                label="Completed"
                value={counts.completed.toString()}
                delta={`${total > 0 ? Math.round((counts.completed / total) * 100) : 0}% completion rate`}
                deltaPositive
                icon="✅"
                color="green"
              />
              <KpiCard
                label="Cancelled"
                value={counts.cancelled.toString()}
                delta={`${total > 0 ? Math.round((counts.cancelled / total) * 100) : 0}% cancellation`}
                deltaPositive={false}
                icon="✕"
                color="red"
              />
            </>
          )}
        </div>

        {/* Map + quick info */}
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Live fleet map</h2>
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <MapPlaceholder />
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Active bookings
              </p>
              {fleetStats === null ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-6" />
                    </div>
                  ))}
                </div>
              ) : (
                [
                  { label: 'En route',  count: fleetStats.inTransit, color: 'bg-brand-500' },
                  { label: 'Arriving',  count: fleetStats.arriving,  color: 'bg-amber-500' },
                  { label: 'Accepted',  count: fleetStats.pending,   color: 'bg-emerald-500' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800/60 last:border-none">
                    <div className="flex items-center gap-2.5">
                      <span className={`size-2 rounded-full ${item.color}`} />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.count}</span>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Page summary
              </p>
              {bookings === null ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                [
                  { label: 'Showing bookings', value: bookings.length.toString() },
                  { label: 'Total (all pages)', value: total.toString() },
                  { label: 'Page revenue',      value: formatCurrency(todayRevenue ?? 0) },
                  { label: 'Completion rate',   value: total > 0 ? `${Math.round(((counts?.completed ?? 0) / total) * 100)}%` : '—' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800/60 last:border-none">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{item.label}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.value}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bookings table */}
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">All bookings</h2>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => { setStatus(value); setPage(1); }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    statusFilter === value
                      ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden dark:border-gray-800 dark:bg-gray-950">
            {bookings === null ? (
              <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                {Array.from({ length: 6 }).map((_, i) => (
                  <li key={i} className="flex items-center justify-between px-5 py-4">
                    <div className="flex-1 space-y-2 mr-8">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </li>
                ))}
              </ul>
            ) : bookings.length === 0 ? (
              <CardBody className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-2xl">
                  📭
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No bookings found</p>
                <p className="mt-1 text-xs text-gray-400">Try a different status filter.</p>
              </CardBody>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      <th className="px-5 py-3">Reference</th>
                      <th className="px-3 py-3">Route</th>
                      <th className="px-3 py-3">Vehicle</th>
                      <th className="px-3 py-3">Fare</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Driver</th>
                      <th className="px-3 py-3">Created</th>
                      <th className="px-3 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {bookings.map((b) => {
                      const cancellable = !['completed', 'cancelled', 'expired'].includes(b.status);
                      return (
                        <tr key={b.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-900/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <span className="font-mono text-xs font-medium text-gray-900 dark:text-gray-100">
                              {b.referenceCode}
                            </span>
                          </td>
                          <td className="max-w-[180px] px-3 py-3.5">
                            <p className="truncate text-xs text-gray-700 dark:text-gray-300">{b.pickupAddress}</p>
                            <p className="truncate text-xs text-gray-400">→ {b.dropoffAddress}</p>
                          </td>
                          <td className="px-3 py-3.5">
                            <span className="capitalize text-xs text-gray-600 dark:text-gray-400">
                              {b.vehicleType.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-3.5">
                            <span className="text-xs font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(Number(b.finalFare ?? b.estimatedFare ?? 0))}
                            </span>
                          </td>
                          <td className="px-3 py-3.5">
                            <StatusBadge status={b.status} />
                          </td>
                          <td className="px-3 py-3.5">
                            {b.driver ? (
                              <span className="text-xs text-gray-700 dark:text-gray-300">{b.driver.user.fullName}</span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3.5">
                            <span className="text-xs text-gray-400">{formatRelative(b.createdAt)}</span>
                          </td>
                          <td className="px-3 py-3.5 text-right">
                            {cancellable && (
                              <Button
                                variant="secondary"
                                size="sm"
                                isLoading={cancelling === b.id}
                                onClick={() => cancelBooking(b.id)}
                                className="text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                              >
                                Cancel
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages} · {total} total
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

type KpiColor = 'brand' | 'teal' | 'green' | 'red';

const colorMap: Record<KpiColor, string> = {
  brand: 'bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400',
  teal:  'bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400',
  green: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
  red:   'bg-red-50 dark:bg-red-950/50 text-red-500 dark:text-red-400',
};

const deltaColorMap: Record<string, string> = {
  positive: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
  negative: 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/40',
};

function KpiCard({
  label, value, delta, deltaPositive, icon, color,
}: {
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
  icon: string;
  color: KpiColor;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-5">
      <div className="flex items-start justify-between">
        <div className={`grid size-11 place-items-center rounded-xl text-xl ${colorMap[color]}`}>
          {icon}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${deltaPositive ? deltaColorMap.positive : deltaColorMap.negative}`}>
          {delta}
        </span>
      </div>
      <div className="mt-4">
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-5">
      <div className="flex items-start justify-between">
        <Skeleton className="size-11 rounded-xl" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-14" />
      </div>
    </div>
  );
}
