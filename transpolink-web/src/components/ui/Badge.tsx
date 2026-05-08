import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'success' | 'warning' | 'info' | 'danger' | 'brand';
type Size = 'sm' | 'md' | 'lg';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: Size;
}

const tones: Record<Tone, string> = {
  neutral: 'bg-gray-100  text-gray-600   ring-gray-200/70',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
  warning: 'bg-amber-50  text-amber-700  ring-amber-200/70',
  info:    'bg-sky-50    text-sky-700    ring-sky-200/70',
  danger:  'bg-red-50    text-red-700    ring-red-200/70',
  brand:   'bg-brand-50  text-brand-700  ring-brand-200/70',
};

const sizes: Record<Size, string> = {
  sm: 'px-2   py-0.5 text-[11px]',
  md: 'px-2.5 py-1   text-xs',
  lg: 'px-3   py-1   text-sm',
};

export function Badge({ tone = 'neutral', size = 'sm', className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium ring-1 ring-inset leading-none',
        tones[tone],
        sizes[size],
        className,
      )}
      {...rest}
    />
  );
}
