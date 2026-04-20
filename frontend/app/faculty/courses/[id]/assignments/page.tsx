'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AssignmentCard } from '@/components/assignment-card';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ora';
import {
  assignments,
  coding,
  type Assignment,
  type CodingAssessmentBrief,
  type CodingDifficulty,
} from '@/lib/api';

const DIFFICULTY_TONE: Record<CodingDifficulty, 'success' | 'warning' | 'danger'> = {
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
};

export default function FacultyAssignmentsPage() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);
  const [items, setItems] = useState<Assignment[]>([]);
  const [codingItems, setCodingItems] = useState<CodingAssessmentBrief[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(courseId)) return;
    let cancelled = false;
    Promise.all([
      assignments.list(courseId),
      coding.listForCourse(courseId).catch(() => [] as CodingAssessmentBrief[]),
    ])
      .then(([a, c]) => {
        if (!cancelled) {
          setItems(a);
          setCodingItems(c);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load');
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <Link
            href={`/faculty/courses/${courseId}`}
            className="text-xs text-[var(--text-secondary)] hover:underline"
          >
            ← Back to course
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Assignments</h1>
        </div>
        <Button asChild size="sm">
          <Link href={`/faculty/courses/${courseId}/assignments/new`}>
            New assignment
          </Link>
        </Button>
      </header>

      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      ) : error ? (
        <p className="text-sm text-[var(--danger-fg)]">{error}</p>
      ) : items.length === 0 && codingItems.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">
          No assignments created yet.
        </p>
      ) : (
        <div className="space-y-6">
          {codingItems.length > 0 && (
            <section className="space-y-3">
              <h2 className="t-caption font-semibold uppercase tracking-wide text-[var(--ember)]">
                Coding assessments
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {codingItems.map((c) => (
                  <Card key={c.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{c.title}</CardTitle>
                        <Badge tone="ember">Code</Badge>
                      </div>
                      <CardDescription>
                        {c.allowed_languages.length} lang · max {c.max_score} pts
                        {c.due_date &&
                          ` · due ${new Date(c.due_date).toLocaleDateString()}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (!confirm('Delete coding assessment?')) return;
                          await coding.remove(c.id);
                          setCodingItems((prev) =>
                            prev.filter((x) => x.id !== c.id),
                          );
                        }}
                      >
                        Delete
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

        <div className="grid gap-4 md:grid-cols-2">
          {items.map((a) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              footer={
                a.type === 'quiz' ? (
                  <Button asChild size="sm" variant="secondary">
                    <Link
                      href={`/faculty/courses/${courseId}/assignments/${a.id}/edit`}
                    >
                      Edit quiz
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="secondary">
                    <Link
                      href={`/faculty/courses/${courseId}/assignments/${a.id}/submissions`}
                    >
                      Review submissions
                    </Link>
                  </Button>
                )
              }
            />
          ))}
        </div>
        </div>
      )}
    </div>
  );
}
