import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg bg-[var(--surface-raised)] border-hair ${className}`}
      {...rest}
    />
  );
}

export function CardHeader({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 border-hair-b ${className}`} {...rest} />;
}

export function CardContent({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 ${className}`} {...rest} />;
}

export function CardFooter({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 border-hair-t ${className}`} {...rest} />;
}

export function CardTitle({ className = '', ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`t-h2 text-[var(--text-primary)] ${className}`} {...rest} />;
}

export function CardDescription({
  className = '',
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`t-body text-[var(--text-secondary)] mt-1 ${className}`} {...rest} />
  );
}
