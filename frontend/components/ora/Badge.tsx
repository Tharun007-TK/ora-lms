'use client';

import { forwardRef, type HTMLAttributes } from 'react';

type Tone =
  | 'neutral'
  | 'ember'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

type Size = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: Size;
}

const TONE: Record<Tone, string> = {
  neutral: 'bg-[var(--surface-sunken)] text-[var(--text-secondary)]',
  ember: 'bg-[var(--ember)] text-[var(--ember-ink)]',
  info: 'bg-[var(--info-bg)] text-[var(--info-fg)]',
  success: 'bg-[var(--success-bg)] text-[var(--success-fg)]',
  warning: 'bg-[var(--warning-bg)] text-[var(--warning-fg)]',
  danger: 'bg-[var(--danger-bg)] text-[var(--danger-fg)]',
};

const SIZE: Record<Size, string> = {
  sm: 'h-4 px-1.5 text-[10px]',
  md: 'h-5 px-2 text-[11px]',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { tone = 'neutral', size = 'sm', className = '', children, ...rest },
  ref,
) {
  const classes = [
    'inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide',
    SIZE[size],
    TONE[tone],
    className,
  ].join(' ');

  return (
    <span ref={ref} className={classes} {...rest}>
      {children}
    </span>
  );
});
