'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AIAssistant } from '@/components/ai-assistant';
import { Badge, Button } from '@/components/ora';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ora';
import {
  coding,
  courses,
  type CodingAssessmentBrief,
  type Course,
} from '@/lib/api';

export default function StudentCourseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);

  const [course, setCourse] = useState<Course | null>(null);
  const [codingList, setCodingList] = useState<CodingAssessmentBrief[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setCourse(await courses.get(id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load course');
    }
  };

  const loadCoding = async () => {
    try {
      setCodingList(await coding.listForCourse(id));
    } catch {
      setCodingList([]);
    }
  };

  useEffect(() => {
    if (Number.isFinite(id)) {
      load();
      loadCoding();
    }
  }, [id]);

  if (error) return <p className="text-sm text-[var(--danger-fg)]">{error}</p>;
  if (!course) return <p className="text-sm text-[var(--text-secondary)]">Loading…</p>;

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
          <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
            {course.code} · {course.semester || 'Semester TBD'}
          </p>
          <h1 className="text-3xl font-semibold">{course.title}</h1>
          {course.faculty_name && (
            <p className="text-sm text-[var(--text-secondary)]">
              Faculty: {course.faculty_name}
            </p>
          )}
        </div>
        <Button variant={course.enrolled ? 'secondary' : 'primary'} onClick={enroll}>
          {course.enrolled ? 'Unenroll' : 'Enroll'}
        </Button>
      </header>

      {course.description && (
        <Card>
          <CardHeader>
            <CardTitle>About this course</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
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
            <Button asChild variant="secondary">
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
            <Button asChild variant="secondary">
              <Link href={`/student/courses/${course.id}/assignments`}>
                Go to Assignments
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {course.enrolled && codingList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Coding assessments</CardTitle>
            <CardDescription>
              Graded coding problems for this course.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {codingList.map((c) => {
              const overdue =
                c.due_date && new Date(c.due_date).getTime() < Date.now();
              const attempts = c.attempts_used ?? 0;
              return (
                <Link
                  key={c.id}
                  href={`/student/practice/${c.id}`}
                  className="focus-ora flex items-center justify-between rounded-md border-hair bg-[var(--surface-raised)] px-3 py-2 transition-colors hover:border-[var(--ember)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    <p className="t-caption text-[var(--text-secondary)]">
                      {c.max_score} max ·{' '}
                      {c.due_date
                        ? `due ${new Date(c.due_date).toLocaleDateString()}`
                        : 'no due date'}{' '}
                      · {attempts}/{c.max_attempts} attempts
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {overdue && <Badge tone="danger">Overdue</Badge>}
                    {c.best_score != null && (
                      <Badge tone="success">
                        {c.best_score}/{c.max_score}
                      </Badge>
                    )}
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      {course.enrolled && <AIAssistant courseId={course.id} />}
    </div>
  );
}
