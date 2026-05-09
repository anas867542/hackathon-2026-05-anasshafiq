'use client';

import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
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

const PAGE_SIZE = 20;

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatus] = useState<BookingStatus | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <DashboardHeader title="Bookings" />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {error && (
          <div className="rounded-xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Summary bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              All bookings
              {total > 0 && (
                <span className="ml-2 rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  {total}
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Manage and monitor all platform bookings
            </p>
          </div>

          {/* Status filter pills */}
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

        {/* Table */}
        <Card className="overflow-hidden dark:border-gray-800 dark:bg-gray-950">
          {bookings === null ? (
            <ul className="divide-y divide-gray-50 dark:divide-gray-800">
              {Array.from({ length: 8 }).map((_, i) => (
                <li key={i} className="flex items-center justify-between px-5 py-4">
                  <div className="flex-1 space-y-2 mr-8">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </li>
              ))}
            </ul>
          ) : bookings.length === 0 ? (
            <CardBody className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-3xl">
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
                    <th className="px-3 py-3">Customer route</th>
                    <th className="px-3 py-3">Vehicle</th>
                    <th className="px-3 py-3">Type</th>
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
                          <span className="capitalize rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-400">
                            {b.bookingType}
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
                            <div>
                              <p className="text-xs text-gray-700 dark:text-gray-300">{b.driver.user.fullName}</p>
                              <p className="text-[10px] text-gray-400">{b.driver.user.phone}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Unassigned</span>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages} · {total} total bookings
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
      </div>
    </div>
  );
}
