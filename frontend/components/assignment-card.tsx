import type { ReactNode } from 'react';
import Link from 'next/link';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ora';
import { cn } from '@/lib/utils';
import type { Assignment } from '@/lib/api';

export function dueDateTone(due: string): 'overdue' | 'soon' | 'ok' {
  const ms = new Date(due).getTime() - Date.now();
  if (ms < 0) return 'overdue';
  if (ms < 24 * 60 * 60 * 1000) return 'soon';
  return 'ok';
}

export function formatCountdown(due: string): string {
  const ms = new Date(due).getTime() - Date.now();
  const abs = Math.abs(ms);
  const days = Math.floor(abs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((abs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const base = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  return ms < 0 ? `Overdue by ${base}` : `Due in ${base}`;
}

export function AssignmentCard({
  assignment,
  href,
  footer,
}: {
  assignment: Assignment;
  href?: string;
  footer?: ReactNode;
}) {
  const tone = dueDateTone(assignment.due_date);
  const Heading = href ? (
    <Link
      href={href}
      className="hover:text-[var(--ember)] transition-colors focus-ora rounded"
    >
      {assignment.title}
    </Link>
  ) : (
    assignment.title
  );

  const isQuiz = assignment.type === 'quiz';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{Heading}</CardTitle>
          <Badge tone={isQuiz ? 'ember' : 'neutral'}>
            {isQuiz ? 'Quiz' : 'File'}
          </Badge>
        </div>
        <CardDescription>
          {new Date(assignment.due_date).toLocaleString()} · {assignment.max_marks} marks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {assignment.description && (
          <p className="t-body text-[var(--text-secondary)]">{assignment.description}</p>
        )}
        <p
          className={cn(
            't-caption font-medium',
            (tone === 'overdue' || tone === 'soon') && 'text-[var(--danger-fg)]',
            tone === 'ok' && 'text-[var(--text-muted)]',
          )}
        >
          {formatCountdown(assignment.due_date)}
        </p>
        {!isQuiz && assignment.submitted && (
          <p className="t-caption text-[var(--ember)]">
            Submitted
            {assignment.marks != null
              ? ` · Graded ${assignment.marks}/${assignment.max_marks}`
              : ' · Awaiting grade'}
          </p>
        )}
        {isQuiz && assignment.attempt_id != null && (
          <p className="t-caption text-[var(--ember)]">
            {assignment.submitted
              ? `Submitted · ${assignment.score ?? 0}/${assignment.max_score ?? 0}`
              : 'Attempt in progress'}
          </p>
        )}
      </CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
