'use client';

import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { bookingsApi, Booking, BookingStatus, VehicleType } from '@/lib/api/bookings';
import { formatCurrency } from '@/lib/utils';

interface Stats {
  total: number;
  byStatus: Record<BookingStatus, number>;
  byVehicle: Record<string, number>;
  totalRevenue: number;
  avgFare: number;
  completionRate: number;
  cancellationRate: number;
  instantCount: number;
  biddingCount: number;
  scheduledCount: number;
}

const STATUS_LABELS: Partial<Record<BookingStatus, { label: string; color: string }>> = {
  pending:     { label: 'Pending',     color: 'bg-amber-500' },
  accepted:    { label: 'Accepted',    color: 'bg-brand-500' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500' },
  completed:   { label: 'Completed',   color: 'bg-emerald-500' },
  cancelled:   { label: 'Cancelled',   color: 'bg-red-500' },
  expired:     { label: 'Expired',     color: 'bg-gray-400' },
};

const VEHICLE_LABELS: Record<string, string> = {
  mini_truck:   'Mini Truck',
  pickup:       'Pickup',
  medium_truck: 'Medium Truck',
  large_truck:  'Large Truck',
  container:    'Container',
  flatbed:      'Flatbed',
  refrigerated: 'Refrigerated',
};

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    bookingsApi
      .list({ pageSize: 100 })
      .then((res) => {
        const items: Booking[] = res.items;
        const byStatus: Record<string, number> = {};
        const byVehicle: Record<string, number> = {};
        let totalRevenue = 0;
        let fareCount = 0;
        let instantCount = 0;
        let biddingCount = 0;
        let scheduledCount = 0;

        items.forEach((b) => {
          byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;
          byVehicle[b.vehicleType] = (byVehicle[b.vehicleType] ?? 0) + 1;
          const fare = Number(b.finalFare ?? b.estimatedFare ?? 0);
          if (fare > 0) { totalRevenue += fare; fareCount++; }
          if (b.bookingType === 'instant') instantCount++;
          else if (b.bookingType === 'bidding') biddingCount++;
          else if (b.bookingType === 'scheduled') scheduledCount++;
        });

        const total = items.length;
        setStats({
          total,
          byStatus: byStatus as Record<BookingStatus, number>,
          byVehicle,
          totalRevenue,
          avgFare: fareCount > 0 ? totalRevenue / fareCount : 0,
          completionRate: total > 0 ? ((byStatus.completed ?? 0) / total) * 100 : 0,
          cancellationRate: total > 0 ? ((byStatus.cancelled ?? 0) / total) * 100 : 0,
          instantCount,
          biddingCount,
          scheduledCount,
        });
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <DashboardHeader title="Analytics" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Platform analytics</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Computed from all booking records</p>
        </div>

        {/* KPI row */}
        {stats === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total bookings', value: stats.total.toString(), sub: 'All time', color: 'brand' },
              { label: 'Total revenue', value: formatCurrency(stats.totalRevenue), sub: 'All completed', color: 'green' },
              { label: 'Completion rate', value: `${stats.completionRate.toFixed(1)}%`, sub: 'Of all bookings', color: 'teal' },
              { label: 'Avg. fare', value: formatCurrency(stats.avgFare), sub: 'Per booking', color: 'purple' },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-5">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{kpi.value}</p>
                <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">{kpi.sub}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Bookings by status */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-5">Bookings by status</h3>
            {stats === null ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(STATUS_LABELS).map(([status, meta]) => {
                  const count = stats.byStatus[status as BookingStatus] ?? 0;
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`size-2 rounded-full ${meta.color}`} />
                          <span className="text-xs text-gray-600 dark:text-gray-400">{meta.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-900 dark:text-white">{count}</span>
                          <span className="text-[10px] text-gray-400 w-10 text-right">
                            {stats.total > 0 ? `${((count / stats.total) * 100).toFixed(0)}%` : '0%'}
                          </span>
                        </div>
                      </div>
                      <ProgressBar value={count} max={stats.total} color={meta.color} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bookings by vehicle */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-5">Bookings by vehicle type</h3>
            {stats === null ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : Object.keys(stats.byVehicle).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">No data yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(stats.byVehicle)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {VEHICLE_LABELS[type] ?? type}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-900 dark:text-white">{count}</span>
                          <span className="text-[10px] text-gray-400 w-10 text-right">
                            {stats.total > 0 ? `${((count / stats.total) * 100).toFixed(0)}%` : '0%'}
                          </span>
                        </div>
                      </div>
                      <ProgressBar value={count} max={stats.total} color="bg-brand-500" />
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Booking type breakdown */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-5">Booking type breakdown</h3>
            {stats === null ? (
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl bg-gray-50 dark:bg-gray-900 p-4 space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-10" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Instant', count: stats.instantCount, color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-950/50' },
                  { label: 'Bidding', count: stats.biddingCount, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/50' },
                  { label: 'Scheduled', count: stats.scheduledCount, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50' },
                ].map((item) => (
                  <div key={item.label} className={`rounded-xl ${item.bg} p-4`}>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{item.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.count}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {stats.total > 0 ? `${((item.count / stats.total) * 100).toFixed(0)}%` : '0%'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Health metrics */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-5">Platform health</h3>
            {stats === null ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  {
                    label: 'Completion rate',
                    value: `${stats.completionRate.toFixed(1)}%`,
                    bar: stats.completionRate,
                    color: 'bg-emerald-500',
                    note: stats.completionRate >= 80 ? '✓ Healthy' : '⚠ Needs attention',
                    noteColor: stats.completionRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
                  },
                  {
                    label: 'Cancellation rate',
                    value: `${stats.cancellationRate.toFixed(1)}%`,
                    bar: stats.cancellationRate,
                    color: 'bg-red-500',
                    note: stats.cancellationRate <= 15 ? '✓ Healthy' : '⚠ High',
                    noteColor: stats.cancellationRate <= 15 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                  },
                ].map((metric) => (
                  <div key={metric.label} className="rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400">{metric.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{metric.value}</span>
                        <span className={`text-[10px] font-medium ${metric.noteColor}`}>{metric.note}</span>
                      </div>
                    </div>
                    <ProgressBar value={metric.bar} max={100} color={metric.color} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
