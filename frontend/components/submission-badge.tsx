import { cn } from '@/lib/utils';

const STYLES: Record<string, string> = {
  AC: 'bg-[var(--success-bg)] text-[var(--success-fg)] border-[var(--success-fg)]/40',
  WA: 'bg-[var(--danger-bg)] text-[var(--danger-fg)] border-[var(--danger-fg)]/40',
  TLE: 'bg-[var(--warning-bg)] text-[var(--warning-fg)] border-[var(--warning-fg)]/40',
  RE: 'bg-[var(--danger-bg)] text-[var(--danger-fg)] border-[var(--danger-fg)]/40',
  CE: 'bg-[var(--info-bg)] text-[var(--info-fg)] border-[var(--info-fg)]/40',
};

export function SubmissionBadge({
  verdict,
  className,
}: {
  verdict: string;
  className?: string;
}) {
  const style =
    STYLES[verdict] ||
    'bg-[var(--surface-sunken)] text-[var(--text-muted)] border-[var(--surface-border)]';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 t-caption font-semibold',
        style,
        className,
      )}
    >
      {verdict}
    </span>
  );
}
