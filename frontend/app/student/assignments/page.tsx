'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AssignmentCard } from '@/components/assignment-card';
import {
  assignments,
  courses,
  type Assignment,
  type Course,
} from '@/lib/api';

export default function StudentAssignmentsIndexPage() {
  const [items, setItems] = useState<(Assignment & { course: Course })[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const myCourses = await courses.list({ mine: true });
        const lists = await Promise.all(
          myCourses.map(async (c) => {
            const list = await assignments.list(c.id);
            return list.map((a) => ({ ...a, course: c }));
          }),
        );
        if (cancelled) return;
        setItems(
          lists.flat().sort(
            (a, b) =>
              new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
          ),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Assignments</h1>
      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      ) : error ? (
        <p className="text-sm text-[var(--danger-fg)]">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">
          No assignments yet. Enroll in a course to see work appear here.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((a) => (
            <div key={a.id} className="space-y-1">
              <Link
                href={`/student/courses/${a.course.id}`}
                className="text-xs uppercase tracking-widest text-[var(--text-secondary)] hover:underline"
              >
                {a.course.code}
              </Link>
              <AssignmentCard
                assignment={a}
                href={`/student/courses/${a.course.id}/assignments`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
