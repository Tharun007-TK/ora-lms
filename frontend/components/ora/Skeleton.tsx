import type { HTMLAttributes } from 'react';

export function Skeleton({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`pulse-ora rounded-md bg-[var(--surface-sunken)] ${className}`}
      {...rest}
    />
  );
}
