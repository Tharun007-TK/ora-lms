'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const SIZE: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-[13px]',
  md: 'h-8 px-3.5 text-[14px]',
  lg: 'h-10 px-4 text-[15px]',
};

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-[var(--ember)] text-[var(--ember-ink)] hover:opacity-90',
  secondary:
    'bg-[var(--surface-raised)] text-[var(--text-primary)] border-hair hover:bg-[var(--surface-sunken)]',
  ghost:
    'bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]',
  danger:
    'bg-[var(--danger-bg)] text-[var(--danger-fg)] hover:opacity-90',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, className = '', children, ...rest },
  ref,
) {
  const classes = [
    'inline-flex items-center justify-center gap-2 rounded-md font-medium',
    'transition-colors focus-ora',
    'disabled:opacity-50 disabled:pointer-events-none',
    SIZE[size],
    VARIANT[variant],
    className,
  ].join(' ');

  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="inline-block">…</span> : children}
    </button>
  );
});
