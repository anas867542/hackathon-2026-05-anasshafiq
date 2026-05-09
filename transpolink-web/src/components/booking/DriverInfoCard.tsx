'use client';

import type { BookingDriver, BookingTruck } from '@/lib/api/bookings';

interface Props {
  driver: BookingDriver;
  truck?: BookingTruck | null;
}

export function DriverInfoCard({ driver, truck }: Props) {
  const initial = driver.user.fullName.trim().charAt(0).toUpperCase() || '?';
  const rating  = Number(driver.ratingAvg);

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 animate-slide-up">
      <div className="flex items-center gap-4 px-5 py-4 sm:px-6">
        {/* Avatar */}
        <div className="relative shrink-0">
          {driver.user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={driver.user.avatarUrl}
              alt={driver.user.fullName}
              className="size-14 rounded-full object-cover ring-2 ring-white dark:ring-gray-800 shadow-soft"
            />
          ) : (
            <div className="grid size-14 place-items-center rounded-full bg-brand-600 text-lg font-bold text-white shadow-soft">
              {initial}
            </div>
          )}
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white dark:border-gray-950 bg-emerald-500"
          />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 dark:text-white truncate">{driver.user.fullName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {rating > 0
              ? `${rating.toFixed(1)} ★ · ${driver.totalTrips} ${driver.totalTrips === 1 ? 'trip' : 'trips'}`
              : `New driver · ${driver.totalTrips} trips`}
          </p>
          {truck && (
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300">
              <span className="font-mono font-medium">{truck.plateNumber}</span>
              <span className="text-gray-400">·</span>
              <span className="capitalize">{truck.type.replace('_', ' ')}</span>
              {truck.model ? <><span className="text-gray-400">·</span><span>{truck.model}</span></> : null}
            </p>
          )}
        </div>

        {/* Call button */}
        <a
          href={`tel:${driver.user.phone}`}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-emerald-700 active:scale-95"
          aria-label={`Call ${driver.user.fullName}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.31 19.79 19.79 0 0 1 1.61 4.63 2 2 0 0 1 3.59 2.45h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.77-.77a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          Call
        </a>
      </div>
    </div>
  );
}
