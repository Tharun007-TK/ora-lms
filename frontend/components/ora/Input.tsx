'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', invalid, ...rest },
  ref,
) {
  const classes = [
    'flex h-8 w-full rounded-md px-3 t-body',
    'bg-[var(--surface-raised)] text-[var(--text-primary)]',
    'border-hair',
    invalid ? '!border-[var(--danger-fg)]' : '',
    'placeholder:text-[var(--text-muted)]',
    'focus-ora',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'transition-colors',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <input ref={ref} className={classes} aria-invalid={invalid || undefined} {...rest} />;
});
