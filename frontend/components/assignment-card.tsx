import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  footer?: React.ReactNode;
}) {
  const tone = dueDateTone(assignment.due_date);
  const Heading = href ? (
    <Link href={href} className="hover:underline">
      {assignment.title}
    </Link>
  ) : (
    assignment.title
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{Heading}</CardTitle>
        <CardDescription>
          {new Date(assignment.due_date).toLocaleString()} · {assignment.max_marks} marks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {assignment.description && (
          <p className="text-muted-foreground">{assignment.description}</p>
        )}
        <p
          className={cn(
            'text-xs font-medium',
            tone === 'overdue' && 'text-destructive',
            tone === 'soon' && 'text-destructive',
            tone === 'ok' && 'text-muted-foreground',
          )}
        >
          {formatCountdown(assignment.due_date)}
        </p>
        {assignment.submitted && (
          <p className="text-xs text-primary">
            Submitted
            {assignment.marks != null
              ? ` · Graded ${assignment.marks}/${assignment.max_marks}`
              : ' · Awaiting grade'}
          </p>
        )}
      </CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
