'use client';

import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { driversApi, AdminDriverSummary } from '@/lib/api/drivers';

type DriverStatusKey = 'online' | 'on_trip' | 'offline' | 'suspended';

const STATUS_COLORS: Record<string, string> = {
  online:    'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400',
  on_trip:   'bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-400',
  offline:   'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  suspended: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400',
};

const STATUS_LABEL: Record<string, string> = {
  online:    'Online',
  on_trip:   'On trip',
  offline:   'Offline',
  suspended: 'Suspended',
};

const DOC_STATUS_COLORS: Record<string, string> = {
  approved: 'text-emerald-600 dark:text-emerald-400',
  pending:  'text-amber-600 dark:text-amber-400',
  rejected: 'text-red-600 dark:text-red-400',
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<AdminDriverSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    driversApi
      .listAll()
      .then((res) => setDrivers(res.items))
      .catch((e) => setError((e as Error).message));
  }, []);

  const filtered = (drivers ?? []).filter((d) => {
    const q = search.toLowerCase();
    return (
      d.user.fullName.toLowerCase().includes(q) ||
      (d.user.phone ?? '').includes(q) ||
      d.user.email.toLowerCase().includes(q)
    );
  });

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
          {rating > 0 ? Number(rating).toFixed(1) : '—'}
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
              All registered drivers on the platform
            </p>
          </div>
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, or email…"
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
              {search ? 'No drivers match your search' : 'No drivers registered yet'}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {search ? 'Try a different name, phone, or email.' : 'Drivers appear here once they register.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((driver) => {
              const status = driver.status as DriverStatusKey;
              const activeTrucks = driver.trucks.filter((t) => t.isActive);
              return (
                <div
                  key={driver.id}
                  className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 hover:border-brand-200 dark:hover:border-brand-900 hover:shadow-card transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                        {driver.user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{driver.user.fullName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{driver.user.phone || driver.user.email}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[status] ?? STATUS_COLORS.offline}`}>
                      {STATUS_LABEL[status] ?? status}
                    </span>
                  </div>

                  {renderStars(Number(driver.ratingAvg))}

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-2.5">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">Total trips</p>
                      <p className="text-base font-bold text-gray-900 dark:text-white">{driver.totalTrips}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-2.5">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">Active trucks</p>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white capitalize">
                        {activeTrucks.length > 0
                          ? activeTrucks.slice(0, 2).map((t) => t.type.replace(/_/g, ' ')).join(', ')
                          : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                      Joined {new Date(driver.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <span className={`text-[10px] font-medium capitalize ${DOC_STATUS_COLORS[driver.docStatus] ?? 'text-gray-400'}`}>
                      Docs: {driver.docStatus}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
