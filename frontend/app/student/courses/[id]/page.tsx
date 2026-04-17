'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AIAssistant } from '@/components/ai-assistant';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { courses, type Course } from '@/lib/api';

export default function StudentCourseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);

  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setCourse(await courses.get(id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load course');
    }
  };

  useEffect(() => {
    if (Number.isFinite(id)) load();
  }, [id]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!course) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const enroll = async () => {
    try {
      if (course.enrolled) await courses.unenroll(course.id);
      else await courses.enroll(course.id);
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {course.code} · {course.semester || 'Semester TBD'}
          </p>
          <h1 className="text-3xl font-semibold">{course.title}</h1>
          {course.faculty_name && (
            <p className="text-sm text-muted-foreground">
              Faculty: {course.faculty_name}
            </p>
          )}
        </div>
        <Button variant={course.enrolled ? 'secondary' : 'default'} onClick={enroll}>
          {course.enrolled ? 'Unenroll' : 'Enroll'}
        </Button>
      </header>

      {course.description && (
        <Card>
          <CardHeader>
            <CardTitle>About this course</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">
            {course.description}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>
              Course material, readings, and AI-generated summaries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={`/student/courses/${course.id}/notes`}>
                Open notes
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
            <CardDescription>Submit work and track grades.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={`/student/courses/${course.id}/assignments`}>
                Open assignments
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {course.enrolled && <AIAssistant courseId={course.id} />}
    </div>
  );
}
