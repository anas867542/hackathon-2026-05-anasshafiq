'use client';

import { Card, CardBody } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';

interface Props {
  distanceKm:      number | null;
  durationMinutes: number | null;
  estimatedFare:   number | null;
}

export function FareEstimate({ distanceKm, durationMinutes, estimatedFare }: Props) {
  const hasData = estimatedFare != null;

  return (
    <Card
      elevated={hasData}
      className={hasData ? 'border-brand-200 bg-gradient-to-br from-brand-50 to-white' : ''}
    >
      <CardBody className="space-y-4 pt-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Estimated fare</p>
          <p className={`mt-1 text-4xl font-bold tracking-tight ${hasData ? 'text-gray-900' : 'text-gray-200'}`}>
            {hasData ? formatCurrency(estimatedFare) : '—'}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
          <div>
            <dt className="text-xs text-gray-400 font-medium">Distance</dt>
            <dd className={`mt-0.5 text-sm font-semibold ${hasData ? 'text-gray-900' : 'text-gray-300'}`}>
              {distanceKm != null ? `${distanceKm.toFixed(1)} km` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 font-medium">Duration</dt>
            <dd className={`mt-0.5 text-sm font-semibold ${hasData ? 'text-gray-900' : 'text-gray-300'}`}>
              {durationMinutes != null ? `~${durationMinutes} min` : '—'}
            </dd>
          </div>
        </dl>

        <p className="text-xs text-gray-400 leading-relaxed">
          Final fare may vary based on actual route, waiting time, and tolls.
        </p>
      </CardBody>
    </Card>
  );
}
