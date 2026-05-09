'use client';

import { formatCurrency } from '@/lib/utils';

interface Props {
  distanceKm:      number | null;
  durationMinutes: number | null;
  estimatedFare:   number | null;
}

export function FareEstimate({ distanceKm, durationMinutes, estimatedFare }: Props) {
  const hasData = estimatedFare != null;

  return (
    <div className={`rounded-2xl border p-5 sm:p-6 space-y-4 transition-all ${
      hasData
        ? 'border-brand-200 dark:border-brand-800 bg-gradient-to-br from-brand-50 to-white dark:from-brand-950/40 dark:to-gray-950 shadow-card'
        : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950'
    }`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Estimated fare</p>
        <p className={`mt-1 text-4xl font-bold tracking-tight ${hasData ? 'text-gray-900 dark:text-white' : 'text-gray-200 dark:text-gray-700'}`}>
          {hasData ? formatCurrency(estimatedFare) : '—'}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 border-t border-gray-100 dark:border-gray-800 pt-3">
        <div>
          <dt className="text-xs text-gray-400 dark:text-gray-500 font-medium">Distance</dt>
          <dd className={`mt-0.5 text-sm font-semibold ${hasData ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-700'}`}>
            {distanceKm != null ? `${distanceKm.toFixed(1)} km` : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400 dark:text-gray-500 font-medium">Duration</dt>
          <dd className={`mt-0.5 text-sm font-semibold ${hasData ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-700'}`}>
            {durationMinutes != null ? `~${durationMinutes} min` : '—'}
          </dd>
        </div>
      </dl>

      <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
        Final fare may vary based on actual route, waiting time, and tolls.
      </p>
    </div>
  );
}
