import { Badge } from '@/components/ui/Badge';

const tone = {
  pending:     'warning',
  matched:     'brand',
  accepted:    'brand',
  arrived:     'brand',
  in_progress: 'info',
  completed:   'success',
  cancelled:   'danger',
  expired:     'neutral',
} as const;

const label: Record<keyof typeof tone, string> = {
  pending:     'Searching driver',
  matched:     'Matched',
  accepted:    'Accepted',
  arrived:     'Driver arrived',
  in_progress: 'In transit',
  completed:   'Completed',
  cancelled:   'Cancelled',
  expired:     'Expired',
};

const dot: Record<keyof typeof tone, string> = {
  pending:     'bg-amber-400 animate-ping',
  matched:     'bg-brand-500 animate-pulse',
  accepted:    'bg-brand-500 animate-pulse',
  arrived:     'bg-brand-500 animate-pulse',
  in_progress: 'bg-sky-500 animate-pulse',
  completed:   'bg-emerald-500',
  cancelled:   'bg-red-400',
  expired:     'bg-gray-400',
};

export function StatusBadge({ status }: { status: keyof typeof tone | string | null }) {
  const key      = (status ?? 'pending') as keyof typeof tone;
  const dotClass = dot[key]  ?? 'bg-gray-400';
  return (
    <Badge tone={tone[key] ?? 'neutral'} size="md">
      <span className={`mr-1.5 inline-block size-1.5 rounded-full ${dotClass}`} aria-hidden />
      {label[key] ?? key}
    </Badge>
  );
}
