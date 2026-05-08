'use client';

import { useEffect, useRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open:       boolean;
  onClose:    () => void;
  title?:     string;
  maxHeight?: string;
  children:   React.ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onClose,
  title,
  maxHeight = '92dvh',
  children,
  className,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxHeight }}
        className={cn(
          'relative z-10 w-full overflow-y-auto',
          'rounded-t-3xl lg:rounded-2xl lg:max-w-lg',
          'bg-white border border-gray-100',
          'shadow-bottom-sheet',
          'animate-slide-up',
          className,
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 lg:hidden">
          <span className="h-1 w-10 rounded-full bg-gray-200" aria-hidden />
        </div>

        {title && (
          <div className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-gray-50">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="3" x2="13" y2="13" />
                <line x1="13" y1="3" x2="3" y2="13" />
              </svg>
            </button>
          </div>
        )}

        <div className="px-5 pb-8 pt-4">{children}</div>
      </div>
    </div>
  );
}

export function BottomSheetSection({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('border-t border-gray-50 py-4 first:border-none first:pt-0', className)} {...rest} />
  );
}
