'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { CourseCard } from '@/components/course-card';
import { Button } from '@/components/ui/button';
import { courses, type Course } from '@/lib/api';

export default function FacultyDashboardPage() {
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    courses
      .list({ mine: true })
      .then((data) => !cancelled && setMyCourses(data))
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
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My courses</h1>
          <p className="text-sm text-muted-foreground">
            Manage course content, publish assignments, and grade submissions.
          </p>
        </div>
        <Button asChild>
          <Link href="/faculty/courses/new">Create course</Link>
        </Button>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : myCourses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No courses yet. Create one to get started.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myCourses.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              href={`/faculty/courses/${c.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
