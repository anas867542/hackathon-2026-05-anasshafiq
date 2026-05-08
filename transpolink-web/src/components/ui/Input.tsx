import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface FieldProps {
  label?: string;
  hint?:  string;
  error?: string;
}

interface InputProps    extends InputHTMLAttributes<HTMLInputElement>,       FieldProps {}
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldProps {}

const baseInput = [
  'block w-full rounded-xl',
  'border border-gray-200 bg-white',
  'px-4 py-3',
  'text-sm text-gray-900 leading-snug',
  'placeholder-gray-400',
  'transition-all duration-150',
  'focus:border-brand-500 focus:ring-0 focus:shadow-input-focus focus:outline-none',
  'disabled:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed',
].join(' ');

const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className={labelClass}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        className={cn(
          baseInput,
          error ? 'border-red-400 focus:border-red-500 focus:shadow-none' : '',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p className="flex items-center gap-1.5 text-xs text-red-600 mt-1.5">
          <span aria-hidden className="shrink-0 text-red-500">⚠</span>
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-gray-400 mt-1">{hint}</p>
      ) : null}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id, rows = 3, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className={labelClass}>
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        ref={ref}
        rows={rows}
        className={cn(
          baseInput,
          'resize-none',
          error ? 'border-red-400 focus:border-red-500 focus:shadow-none' : '',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p className="flex items-center gap-1.5 text-xs text-red-600 mt-1.5">
          <span aria-hidden className="shrink-0">⚠</span>
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-gray-400 mt-1">{hint}</p>
      ) : null}
    </div>
  );
});
