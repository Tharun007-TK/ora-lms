import { Badge } from '@/components/ora';

type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const VERDICT_TONE: Record<string, BadgeTone> = {
  AC: 'success',
  WA: 'danger',
  TLE: 'warning',
  RE: 'danger',
  CE: 'info',
};

export function SubmissionBadge({
  verdict,
  className,
}: {
  verdict: string;
  className?: string;
}) {
  const tone: BadgeTone = VERDICT_TONE[verdict] ?? 'neutral';
  return (
    <Badge tone={tone} size="md" className={className}>
      {verdict}
    </Badge>
  );
}
