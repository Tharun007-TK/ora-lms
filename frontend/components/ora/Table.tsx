'use client';

import {
  forwardRef,
  type HTMLAttributes,
  type TableHTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react';

export const Table = forwardRef<
  HTMLTableElement,
  TableHTMLAttributes<HTMLTableElement>
>(function Table({ className = '', ...rest }, ref) {
  return (
    <table
      ref={ref}
      className={`w-full border-collapse text-sm ${className}`}
      {...rest}
    />
  );
});

export const THead = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function THead({ className = '', ...rest }, ref) {
  return (
    <thead
      ref={ref}
      className={`border-b-hair text-left text-[var(--text-muted)] ${className}`}
      {...rest}
    />
  );
});

export const TBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TBody({ className = '', ...rest }, ref) {
  return <tbody ref={ref} className={className} {...rest} />;
});

export const TR = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(function TR({ className = '', ...rest }, ref) {
  return <tr ref={ref} className={`border-b-hair ${className}`} {...rest} />;
});

export const TH = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement>
>(function TH({ className = '', ...rest }, ref) {
  return (
    <th
      ref={ref}
      className={`p-3 t-caption font-semibold uppercase tracking-wide ${className}`}
      {...rest}
    />
  );
});

export const TD = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement>
>(function TD({ className = '', ...rest }, ref) {
  return <td ref={ref} className={`p-3 t-body ${className}`} {...rest} />;
});
