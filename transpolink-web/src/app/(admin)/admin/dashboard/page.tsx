'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/status/StatusBadge';
import { bookingsApi, Booking, BookingStatus } from '@/lib/api/bookings';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api/client';
import { formatCurrency, formatRelative } from '@/lib/utils';

const STATUS_FILTERS: { label: string; value: BookingStatus | undefined }[] = [
  { label: 'All',         value: undefined },
  { label: 'Pending',     value: 'pending' },
  { label: 'Active',      value: 'accepted' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed',   value: 'completed' },
  { label: 'Cancelled',   value: 'cancelled' },
];

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const [bookings, setBookings]     = useState<Booking[] | null>(null);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [statusFilter, setStatus]   = useState<BookingStatus | undefined>(undefined);
  const [error, setError]           = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const PAGE_SIZE = 15;

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
      setBookings((prev) => prev?.map((b) => b.id === id ? updated : b) ?? null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to cancel booking');
    } finally {
      setCancelling(null);
    }
  }

  // Compute stat counts from current page — shown until we load full data
  const counts = bookings
    ? {
        pending:     bookings.filter(b => b.status === 'pending').length,
        active:      bookings.filter(b => ['accepted','arrived','in_progress'].includes(b.status)).length,
        completed:   bookings.filter(b => b.status === 'completed').length,
        cancelled:   bookings.filter(b => b.status === 'cancelled').length,
      }
    : null;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">Signed in as</p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{user?.email}</h1>
        </div>
        <Button variant="secondary" size="sm" onClick={logout}>
          Sign out
        </Button>
      </header>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {counts === null ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total bookings"  value={total.toString()}               icon="📦" />
            <StatCard label="Active"          value={counts.active.toString()}        icon="🚛" highlight />
            <StatCard label="Completed"       value={counts.completed.toString()}     icon="✅" />
            <StatCard label="Cancelled"       value={counts.cancelled.toString()}     icon="✕" />
          </>
        )}
      </div>

      {/* Bookings table */}
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">All bookings</h2>

          {/* Status filter pills */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => { setStatus(value); setPage(1); }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  statusFilter === value
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden">
          {bookings === null ? (
            <ul className="divide-y divide-zinc-100">
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="flex items-center justify-between px-5 py-4 sm:px-6">
                  <div className="flex-1 space-y-2 mr-8">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </li>
              ))}
            </ul>
          ) : bookings.length === 0 ? (
            <CardBody className="flex flex-col items-center justify-center py-14 text-center">
              <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-zinc-100 text-2xl">📭</div>
              <p className="text-sm font-medium text-zinc-700">No bookings found</p>
              <p className="mt-1 text-xs text-zinc-500">Try a different status filter.</p>
            </CardBody>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    <th className="px-5 py-3 sm:px-6">Reference</th>
                    <th className="px-3 py-3">Route</th>
                    <th className="px-3 py-3">Vehicle</th>
                    <th className="px-3 py-3">Fare</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Driver</th>
                    <th className="px-3 py-3">Created</th>
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {bookings.map((b) => {
                    const cancellable = !['completed', 'cancelled', 'expired'].includes(b.status);
                    return (
                      <tr key={b.id} className="hover:bg-zinc-50/70 transition-colors">
                        <td className="px-5 py-3.5 sm:px-6">
                          <span className="font-mono text-xs font-medium text-zinc-900">{b.referenceCode}</span>
                        </td>
                        <td className="max-w-[200px] px-3 py-3.5">
                          <p className="truncate text-xs text-zinc-700">{b.pickupAddress}</p>
                          <p className="truncate text-xs text-zinc-400">→ {b.dropoffAddress}</p>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="capitalize text-xs text-zinc-700">{b.vehicleType.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="font-medium text-zinc-900">
                            {formatCurrency(Number(b.finalFare ?? b.estimatedFare ?? 0))}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          <StatusBadge status={b.status} />
                        </td>
                        <td className="px-3 py-3.5">
                          {b.driver ? (
                            <span className="text-xs text-zinc-700">{b.driver.user.fullName}</span>
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="text-xs text-zinc-400">{formatRelative(b.createdAt)}</span>
                        </td>
                        <td className="px-3 py-3.5 text-right">
                          {cancellable && (
                            <Button
                              variant="secondary"
                              size="sm"
                              isLoading={cancelling === b.id}
                              onClick={() => cancelBooking(b.id)}
                              className="text-xs"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-zinc-500">
              Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, icon, highlight }: { label: string; value: string; icon: string; highlight?: boolean }) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4 py-5">
        <div className={`grid size-11 shrink-0 place-items-center rounded-xl text-xl ${highlight ? 'bg-brand-50' : 'bg-zinc-100'}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-zinc-500">{label}</p>
          <p className="mt-0.5 text-xl font-semibold tracking-tight text-zinc-900">{value}</p>
        </div>
      </CardBody>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardBody className="flex items-center gap-4 py-5">
        <Skeleton className="size-11 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-12" />
        </div>
      </CardBody>
    </Card>
  );
}
