import Link from 'next/link';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ora';
import type { JudgeProblemBrief, ProblemDifficulty } from '@/lib/api';

const DIFFICULTY_TONE: Record<ProblemDifficulty, 'success' | 'warning' | 'danger'> = {
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
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
          <Badge tone={DIFFICULTY_TONE[problem.difficulty]}>
            {problem.difficulty}
          </Badge>
          {problem.solved && <Badge tone="success">Solved</Badge>}
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
