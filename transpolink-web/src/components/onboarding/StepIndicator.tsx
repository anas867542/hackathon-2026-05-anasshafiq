import { cn } from '@/lib/utils';

interface Props {
  steps: string[];
  current: number;
}

export function StepIndicator({ steps, current }: Props) {
  return (
    <ol className="flex items-center justify-between">
      {steps.map((label, i) => {
        const isComplete = i < current;
        const isCurrent = i === current;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'grid size-8 place-items-center rounded-full border text-xs font-semibold',
                  isComplete && 'border-zinc-900 bg-zinc-900 text-white',
                  isCurrent && !isComplete && 'border-zinc-900 bg-white text-zinc-900',
                  !isComplete && !isCurrent && 'border-zinc-200 bg-white text-zinc-400',
                )}
              >
                {isComplete ? '✓' : i + 1}
              </span>
              <span
                className={cn(
                  'mt-2 text-xs',
                  isComplete || isCurrent ? 'text-zinc-900' : 'text-zinc-400',
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  'mx-2 h-px flex-1',
                  i < current ? 'bg-zinc-900' : 'bg-zinc-200',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
