'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ora';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ora';
import { courses, type Course, type UserBrief } from '@/lib/api';

export default function FacultyCourseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<UserBrief[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([courses.get(id), courses.students(id).catch(() => [])])
      .then(([c, s]) => {
        if (cancelled) return;
        setCourse(c);
        setStudents(s as UserBrief[]);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load course');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <p className="text-sm text-[var(--danger-fg)]">{error}</p>;
  if (!course) return <p className="text-sm text-[var(--text-secondary)]">Loading…</p>;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
          {course.code} · {course.semester || 'Semester TBD'}
        </p>
        <h1 className="text-3xl font-semibold">{course.title}</h1>
        {course.description && (
          <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
            {course.description}
          </p>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>
              Upload or write course material. AI generation arrives Day 4.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href={`/faculty/courses/${course.id}/notes`}>
                Manage notes
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
            <CardDescription>Create work and review submissions.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="secondary">
              <Link href={`/faculty/courses/${course.id}/assignments`}>
                Manage assignments
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/faculty/courses/${course.id}/assignments/new`}>
                New assignment
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Enrolled students</CardTitle>
            <CardDescription>{students.length} students</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-[var(--text-secondary)]">
            {students.length === 0
              ? 'No students enrolled yet.'
              : students
                  .slice(0, 4)
                  .map((s) => s.name)
                  .join(', ') + (students.length > 4 ? ', …' : '')}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
