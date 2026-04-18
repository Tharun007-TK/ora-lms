'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AssignmentCard } from '@/components/assignment-card';
import { Button } from '@/components/ora';
import { assignments, type Assignment } from '@/lib/api';

export default function FacultyAssignmentsPage() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);
  const [items, setItems] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(courseId)) return;
    let cancelled = false;
    assignments
      .list(courseId)
      .then((data) => !cancelled && setItems(data))
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
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">
          No assignments created yet.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((a) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              footer={
                <Button asChild size="sm" variant="secondary">
                  <Link
                    href={`/faculty/courses/${courseId}/assignments/${a.id}/submissions`}
                  >
                    Review submissions
                  </Link>
                </Button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
