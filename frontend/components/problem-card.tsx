import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ora';
import { cn } from '@/lib/utils';
import type { JudgeProblemBrief, ProblemDifficulty } from '@/lib/api';

const DIFFICULTY_STYLE: Record<ProblemDifficulty, string> = {
  easy: 'bg-[var(--success-bg)] text-[var(--success-fg)]',
  medium: 'bg-[var(--warning-bg)] text-[var(--warning-fg)]',
  hard: 'bg-[var(--danger-bg)] text-[var(--danger-fg)]',
};

export function ProblemCard({
  problem,
  href,
}: {
  problem: JudgeProblemBrief;
  href: string;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 t-caption font-semibold capitalize',
              DIFFICULTY_STYLE[problem.difficulty],
            )}
          >
            {problem.difficulty}
          </span>
          {problem.solved && (
            <span className="rounded-full bg-[var(--success-bg)] px-2 py-0.5 t-caption font-semibold text-[var(--success-fg)]">
              Solved
            </span>
          )}
        </div>
        <CardTitle className="t-h3">
          <Link
            href={href}
            className="hover:text-[var(--ember)] transition-colors focus-ora rounded"
          >
            {problem.title}
          </Link>
        </CardTitle>
        <CardDescription>
          Added {new Date(problem.created_at).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
