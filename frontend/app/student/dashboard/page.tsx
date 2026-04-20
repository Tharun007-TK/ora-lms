'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AssignmentCard } from '@/components/assignment-card';
import { CourseCard } from '@/components/course-card';
import { Card, CardContent } from '@/components/ora';
import {
  assignments,
  coding,
  courses,
  type Assignment,
  type Course,
  type PracticeStats,
} from '@/lib/api';

export default function StudentDashboardPage() {
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [upcoming, setUpcoming] = useState<Assignment[]>([]);
  const [practiceStats, setPracticeStats] = useState<PracticeStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [mine, stats] = await Promise.all([
          courses.list({ mine: true }),
          coding.practiceStats().catch(() => null),
        ]);
        if (cancelled) return;
        setMyCourses(mine);
        if (stats) setPracticeStats(stats);
        const lists = await Promise.all(mine.map((c) => assignments.list(c.id)));
        if (cancelled) return;
        const flat = lists.flat();
        const sorted = flat
          .filter((a) => !a.submitted)
          .sort(
            (a, b) =>
              new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
          )
          .slice(0, 5);
        setUpcoming(sorted);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load dashboard');
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
    <div className="space-y-8">
      {practiceStats && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="t-caption text-[var(--text-muted)]">
                Practice points
              </p>
              <p className="text-2xl font-semibold text-[var(--ember)]">
                {practiceStats.total_points}
              </p>
            </div>
            <div>
              <p className="t-caption text-[var(--text-muted)]">Problems solved</p>
              <p className="text-2xl font-semibold">
                {practiceStats.solved_count}
              </p>
            </div>
            <Link
              href="/student/practice"
              className="t-body-sm font-medium text-[var(--ember)] hover:underline"
            >
              Browse practice →
            </Link>
          </CardContent>
        </Card>
      )}

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold">Your courses</h1>
          <Link
            href="/student/courses"
            className="text-sm font-medium text-[var(--ember)] hover:underline"
          >
            Browse all →
          </Link>
        </div>
        {loading ? (
          <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
        ) : error ? (
          <p className="text-sm text-[var(--danger-fg)]">{error}</p>
        ) : myCourses.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            You are not enrolled in any courses yet. Browse the catalog to join one.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myCourses.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                href={`/student/courses/${c.id}`}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Upcoming assignments</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            All caught up — no pending submissions.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {upcoming.map((a) => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                href={`/student/courses/${a.course_id}/assignments`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
