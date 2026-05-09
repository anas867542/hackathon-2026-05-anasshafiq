'use client';

import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { bookingsApi, Booking } from '@/lib/api/bookings';

type DriverStatusKey = 'online' | 'on_trip' | 'offline' | 'suspended' | 'active';

interface DriverSummary {
  id: string;
  fullName: string;
  phone: string;
  trips: number;
  ratingAvg: number;
  ratingCount: number;
  lastTrip: string;
  vehicleTypes: Set<string>;
  status: DriverStatusKey;
}

const STATUS_COLORS: Record<string, string> = {
  online:    'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400',
  active:    'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400',
  on_trip:   'bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-400',
  offline:   'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  suspended: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400',
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Aggregate driver info from completed bookings
    bookingsApi
      .list({ pageSize: 100 })
      .then((res) => {
        const map = new Map<string, DriverSummary>();
        res.items.forEach((b: Booking) => {
          if (!b.driver || !b.driverId) return;
          const existing = map.get(b.driverId);
          if (existing) {
            existing.trips += 1;
            if (b.createdAt > existing.lastTrip) existing.lastTrip = b.createdAt;
            if (b.vehicleType) existing.vehicleTypes.add(b.vehicleType);
          } else {
            const isActive = ['accepted', 'arrived', 'in_progress'].includes(b.status);
            map.set(b.driverId, {
              id: b.driverId,
              fullName: b.driver.user.fullName,
              phone: b.driver.user.phone,
              trips: 1,
              ratingAvg: Number(b.driver.ratingAvg ?? 0),
              ratingCount: b.driver.ratingCount ?? 0,
              lastTrip: b.createdAt,
              vehicleTypes: new Set(b.vehicleType ? [b.vehicleType] : []),
              status: isActive ? 'on_trip' : 'active',
            });
          }
        });
        setDrivers(Array.from(map.values()).sort((a, b) => b.trips - a.trips));
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  const filtered = drivers?.filter((d) =>
    d.fullName.toLowerCase().includes(search.toLowerCase()) ||
    d.phone.includes(search)
  ) ?? [];

  function renderStars(rating: number) {
    const full = Math.round(rating);
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} className={`size-3 ${i < full ? 'fill-amber-400' : 'fill-gray-200 dark:fill-gray-700'}`} viewBox="0 0 24 24">
            <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
          </svg>
        ))}
        <span className="ml-1 text-[10px] text-gray-500 dark:text-gray-400">
          {rating > 0 ? rating.toFixed(1) : '—'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <DashboardHeader title="Drivers" />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {error && (
          <div className="rounded-xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Header row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Driver registry
              {drivers && (
                <span className="ml-2 rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  {drivers.length}
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Drivers active on the platform based on booking history
            </p>
          </div>
          {/* Search */}
          <div className="relative w-full sm:w-56">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone…"
              className="h-9 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-9 pr-4 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
        </div>

        {/* Cards grid */}
        {drivers === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
            <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-3xl">
              🚛
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {search ? 'No drivers match your search' : 'No drivers found'}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Drivers appear here once they complete bookings.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((driver) => (
              <div
                key={driver.id}
                className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 hover:border-brand-200 dark:hover:border-brand-900 hover:shadow-card transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                      {driver.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{driver.fullName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{driver.phone}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[driver.status] ?? STATUS_COLORS.offline}`}>
                    {driver.status === 'on_trip' ? 'On trip' : driver.status === 'active' ? 'Active' : driver.status.charAt(0).toUpperCase() + driver.status.slice(1)}
                  </span>
                </div>

                {renderStars(driver.ratingAvg)}

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-2.5">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Total trips</p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">{driver.trips}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-2.5">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Vehicle types</p>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white capitalize">
                      {Array.from(driver.vehicleTypes).slice(0, 2).map(v => v.replace(/_/g, ' ')).join(', ') || '—'}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-[10px] text-gray-400 dark:text-gray-500">
                  Last trip:{' '}
                  {new Date(driver.lastTrip).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
