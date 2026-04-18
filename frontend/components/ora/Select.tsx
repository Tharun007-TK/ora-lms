'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className = '', invalid, children, ...rest },
  ref,
) {
  const classes = [
    'flex h-8 w-full rounded-md px-3 t-body appearance-none',
    'bg-[var(--surface-raised)] text-[var(--text-primary)]',
    'border-hair',
    invalid ? '!border-[var(--danger-fg)]' : '',
    'focus-ora',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'transition-colors',
    'bg-no-repeat bg-[right_0.75rem_center] bg-[length:0.65rem] pr-8',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <select
      ref={ref}
      className={classes}
      aria-invalid={invalid || undefined}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path fill='none' stroke='%239C9A92' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M2 4.5l4 4 4-4'/></svg>\")",
      }}
      {...rest}
    >
      {children}
    </select>
  );
});
