import { cn } from '@/lib/utils';

const STYLES: Record<string, string> = {
  AC: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40',
  WA: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/40',
  TLE: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40',
  RE: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/40',
  CE: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/40',
};

export function SubmissionBadge({
  verdict,
  className,
}: {
  verdict: string;
  className?: string;
}) {
  const style = STYLES[verdict] || 'bg-muted text-muted-foreground border-border';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
        style,
        className,
      )}
    >
      {verdict}
    </span>
  );
}
