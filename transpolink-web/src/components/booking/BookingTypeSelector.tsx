'use client';

import { cn } from '@/lib/utils';
import type { BookingType } from '@/lib/api/bookings';

interface Option {
  value:    Extract<BookingType, 'instant' | 'bidding'>;
  title:    string;
  subtitle: string;
  icon:     string;
  badge?:   string;
}

const OPTIONS: Option[] = [
  {
    value:    'instant',
    title:    'Fixed price',
    subtitle: 'Match the first available driver at the estimated fare.',
    icon:     '⚡',
    badge:    'Instant',
  },
  {
    value:    'bidding',
    title:    'Driver bidding',
    subtitle: 'Drivers submit offers — you pick the best one.',
    icon:     '🏷️',
    badge:    'Best deal',
  },
];

interface Props {
  value:    'instant' | 'bidding';
  onChange: (v: 'instant' | 'bidding') => void;
}

export function BookingTypeSelector({ value, onChange }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={selected}
            className={cn(
              'relative flex flex-col rounded-2xl border p-4 text-left transition-all duration-150 active:scale-[0.98]',
              selected
                ? 'border-brand-400 bg-brand-50 shadow-soft'
                : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-card',
            )}
          >
            {opt.badge && (
              <span className={cn(
                'absolute -top-2 right-3 rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                selected ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500',
              )}>
                {opt.badge}
              </span>
            )}

            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xl leading-none" aria-hidden>{opt.icon}</span>
                <span className={cn('text-sm font-semibold', selected ? 'text-brand-700' : 'text-gray-900')}>
                  {opt.title}
                </span>
              </div>
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs font-bold',
                  selected ? 'bg-brand-600 text-white' : 'border-2 border-gray-200 bg-white',
                )}
              >
                {selected ? '✓' : ''}
              </span>
            </div>

            <p className={cn('mt-3 text-xs leading-relaxed', selected ? 'text-brand-600' : 'text-gray-500')}>
              {opt.subtitle}
            </p>
          </button>
        );
      })}
    </div>
  );
}
