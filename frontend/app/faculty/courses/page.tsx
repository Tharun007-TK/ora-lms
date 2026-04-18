'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ora';
import { CourseCard } from '@/components/course-card';
import { courses, type Course } from '@/lib/api';

export default function FacultyCoursesPage() {
  const [items, setItems] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    courses
      .list({ mine: true })
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
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Courses</h1>
        <Button asChild size="sm">
          <Link href="/faculty/courses/new">New course</Link>
        </Button>
      </header>
      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      ) : error ? (
        <p className="text-sm text-[var(--danger-fg)]">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No courses yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <CourseCard key={c.id} course={c} href={`/faculty/courses/${c.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
