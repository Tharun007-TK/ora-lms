'use client';

import { forwardRef, type HTMLAttributes } from 'react';

type Size = 'sm' | 'md' | 'lg' | 'xl';
type Shape = 'circle' | 'square';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  fallback: string;
  alt?: string;
  size?: Size;
  shape?: Shape;
}

const SIZE: Record<Size, string> = {
  sm: 'h-6 w-6 text-[11px]',
  md: 'h-10 w-10 text-base',
  lg: 'h-16 w-16 text-2xl',
  xl: 'h-28 w-28 text-4xl',
};

const SHAPE: Record<Shape, string> = {
  circle: 'rounded-full',
  square: 'rounded-md',
};

function initial(fallback: string): string {
  const trimmed = fallback.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(function Avatar(
  {
    src,
    fallback,
    alt,
    size = 'md',
    shape = 'circle',
    className = '',
    ...rest
  },
  ref,
) {
  const classes = [
    'inline-flex shrink-0 items-center justify-center overflow-hidden',
    'border-hair bg-[var(--surface-sunken)]',
    'text-[var(--text-secondary)] font-semibold',
    SIZE[size],
    SHAPE[shape],
    className,
  ].join(' ');

  return (
    <div
      ref={ref}
      className={classes}
      role="img"
      aria-label={alt ?? fallback}
      {...rest}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? fallback}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initial(fallback)}</span>
      )}
    </div>
  );
});
