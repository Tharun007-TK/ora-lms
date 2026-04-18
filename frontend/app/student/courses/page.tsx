'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ora';
import { CourseCard } from '@/components/course-card';
import { courses, type Course } from '@/lib/api';

export default function StudentCoursesPage() {
  const [items, setItems] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await courses.list();
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleEnrollment = async (course: Course) => {
    try {
      if (course.enrolled) await courses.unenroll(course.id);
      else await courses.enroll(course.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Courses</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Browse the catalog and enroll in courses you want to follow.
          </p>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      ) : error ? (
        <p className="text-sm text-[var(--danger-fg)]">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No courses published yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              href={`/student/courses/${c.id}`}
              footer={
                <Button
                  size="sm"
                  variant={c.enrolled ? 'secondary' : 'primary'}
                  onClick={() => toggleEnrollment(c)}
                >
                  {c.enrolled ? 'Unenroll' : 'Enroll'}
                </Button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
