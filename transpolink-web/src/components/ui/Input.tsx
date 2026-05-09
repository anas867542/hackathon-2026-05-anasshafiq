'use client';

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, useState } from 'react';
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

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, type, ...rest },
  ref,
) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputId = id ?? rest.name;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className={labelClass}>
          {label}
        </label>
      )}
      <div className={isPassword ? 'relative' : undefined}>
        <input
          id={inputId}
          ref={ref}
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          className={cn(
            baseInput,
            isPassword ? 'pr-11' : '',
            error ? 'border-red-400 focus:border-red-500 focus:shadow-none' : '',
            className,
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <EyeIcon open={showPassword} />
          </button>
        )}
      </div>
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
