import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { JudgeProblemBrief, ProblemDifficulty } from '@/lib/api';

const DIFFICULTY_STYLE: Record<ProblemDifficulty, string> = {
  easy: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  medium: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  hard: 'bg-red-500/15 text-red-600 dark:text-red-400',
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
              'rounded-full px-2 py-0.5 text-xs font-semibold capitalize',
              DIFFICULTY_STYLE[problem.difficulty],
            )}
          >
            {problem.difficulty}
          </span>
          {problem.solved && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Solved
            </span>
          )}
        </div>
        <CardTitle className="text-base">
          <Link href={href} className="hover:underline">
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
