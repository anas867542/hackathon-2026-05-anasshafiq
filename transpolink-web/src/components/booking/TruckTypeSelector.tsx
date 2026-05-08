'use client';

import { cn } from '@/lib/utils';
import type { VehicleType } from '@/lib/api/bookings';

export interface TruckOption {
  type:        VehicleType;
  name:        string;
  capacity:    string;
  description: string;
  baseFare:    number;
  icon:        string;
}

export const TRUCK_OPTIONS: TruckOption[] = [
  { type: 'mini_truck',   name: 'Mini Truck',   capacity: '< 800 kg',        description: 'Parcels, appliances, small loads',   baseFare: 600,  icon: '🚐' },
  { type: 'pickup',       name: 'Pickup',        capacity: '~ 1 ton',         description: 'Furniture, multi-room moves',        baseFare: 900,  icon: '🛻' },
  { type: 'medium_truck', name: 'Medium',        capacity: '~ 3 tons',        description: 'Apartment moves, retail restocks',   baseFare: 1500, icon: '🚚' },
  { type: 'large_truck',  name: 'Large',         capacity: '~ 7 tons',        description: 'House moves, bulk goods',            baseFare: 2400, icon: '🚛' },
  { type: 'container',    name: 'Container',     capacity: '20+ tons',        description: 'Heavy industrial cargo',             baseFare: 4500, icon: '📦' },
  { type: 'flatbed',      name: 'Flatbed',       capacity: 'Oversized',       description: 'Machinery, vehicles, awkward loads', baseFare: 3200, icon: '🏗️' },
  { type: 'refrigerated', name: 'Refrigerated',  capacity: 'Temp-controlled', description: 'Frozen & perishable goods',          baseFare: 2800, icon: '❄️' },
];

interface Props {
  value:    VehicleType | null;
  onChange: (v: VehicleType) => void;
  compact?: boolean;
}

export function TruckTypeSelector({ value, onChange, compact = false }: Props) {
  if (compact) {
    // Horizontal scrolling strip — used inside bottom sheets
    return (
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {TRUCK_OPTIONS.map((opt) => {
          const selected = value === opt.type;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => onChange(opt.type)}
              aria-pressed={selected}
              className={cn(
                'flex flex-col items-center gap-2 shrink-0 rounded-2xl border p-4 text-center transition-all duration-150 active:scale-95 min-w-[96px]',
                selected
                  ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-soft'
                  : 'border-gray-100 bg-white text-gray-700 hover:border-gray-200',
              )}
            >
              <span className="text-2xl leading-none" aria-hidden>{opt.icon}</span>
              <div>
                <div className="text-xs font-semibold leading-tight">{opt.name}</div>
                <div className={cn('text-[10px] leading-tight mt-0.5', selected ? 'text-brand-500' : 'text-gray-400')}>
                  {opt.capacity}
                </div>
              </div>
              {selected && (
                <span className="absolute -top-1 -right-1 size-4 grid place-items-center rounded-full bg-brand-600 text-[9px] text-white font-bold">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Grid — used on desktop
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {TRUCK_OPTIONS.map((opt) => {
        const selected = value === opt.type;
        return (
          <button
            key={opt.type}
            type="button"
            onClick={() => onChange(opt.type)}
            aria-pressed={selected}
            className={cn(
              'relative flex flex-col rounded-2xl border p-4 text-left transition-all duration-150 active:scale-[0.98]',
              selected
                ? 'border-brand-400 bg-brand-50 shadow-soft'
                : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-card',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl leading-none" aria-hidden>{opt.icon}</span>
                <div>
                  <div className={cn('text-sm font-semibold', selected ? 'text-brand-700' : 'text-gray-900')}>
                    {opt.name}
                  </div>
                  <div className={cn('text-xs', selected ? 'text-brand-500' : 'text-gray-400')}>
                    {opt.capacity}
                  </div>
                </div>
              </div>
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs font-bold',
                  selected
                    ? 'bg-brand-600 text-white'
                    : 'border-2 border-gray-200 bg-white',
                )}
              >
                {selected ? '✓' : ''}
              </span>
            </div>

            <p className={cn('mt-3 text-xs leading-relaxed', selected ? 'text-brand-600' : 'text-gray-500')}>
              {opt.description}
            </p>
            <div className={cn('mt-3 text-xs font-semibold', selected ? 'text-brand-700' : 'text-gray-400')}>
              From PKR {opt.baseFare.toLocaleString()}
            </div>
          </button>
        );
      })}
    </div>
  );
}
