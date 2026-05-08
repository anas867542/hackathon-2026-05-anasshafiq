import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size    = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   Variant;
  size?:      Size;
  isLoading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gray-900 text-white hover:bg-gray-800 active:bg-black active:scale-[0.98] shadow-sm ' +
    'disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none',
  brand:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 active:scale-[0.98] shadow-sm ' +
    'disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none',
  secondary:
    'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 ' +
    'active:bg-gray-100 active:scale-[0.98] shadow-sm disabled:opacity-40',
  ghost:
    'bg-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 ' +
    'active:bg-gray-200 active:scale-[0.98] disabled:opacity-40',
  danger:
    'bg-red-600 text-white hover:bg-red-500 active:bg-red-700 active:scale-[0.98] shadow-sm disabled:opacity-40',
  success:
    'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 active:scale-[0.98] shadow-sm disabled:opacity-40',
};

// xs/sm: capsule for compact/inline actions
// md/lg/xl: rounded-2xl for primary CTAs
const sizes: Record<Size, string> = {
  xs:  'h-7  px-3  text-xs  rounded-full gap-1',
  sm:  'h-9  px-4  text-sm  rounded-full gap-1.5',
  md:  'h-10 px-5  text-sm  rounded-2xl  gap-2',
  lg:  'h-12 px-6  text-base rounded-2xl  gap-2',
  xl:  'h-14 px-8  text-base rounded-2xl  gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', isLoading, disabled, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        'select-none cursor-pointer disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {isLoading && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
});
