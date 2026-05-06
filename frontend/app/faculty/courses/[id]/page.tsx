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
                Go to Assessments
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/faculty/assessments/new">
                New assessment
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Enrolled students</CardTitle>
            <CardDescription>{students.length} students</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {students.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No students enrolled yet.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {students.map((s) => (
                    <Link
                      key={s.id}
                      href={`/u/${s.id}`}
                      className="text-sm text-[var(--ember)] hover:underline"
                    >
                      {s.name}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <PerformanceExport courseId={course.id} students={students} />
    </div>
  );
}

function PerformanceExport({
  courseId,
  students,
}: {
  courseId: number;
  students: UserBrief[];
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = (sid: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const allSelected = students.length > 0 && selected.size === students.length;
  const noneSelected = selected.size === 0;
  const ids = Array.from(selected);
  const url = courses.performanceXlsxUrl(
    courseId,
    noneSelected ? undefined : ids,
  );

  const triggerDownload = async () => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      alert('Export failed: ' + res.statusText);
      return;
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `performance_course_${courseId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance export</CardTitle>
        <CardDescription>
          Excel workbook of student marks across assignments, quizzes, and
          coding assessments. Pick students to filter, or leave blank for the whole class.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {students.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSelected(
                  allSelected ? new Set() : new Set(students.map((s) => s.id)),
                )
              }
              className="rounded-md border-hair px-3 py-1 t-caption font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
            <span className="t-caption text-[var(--text-muted)]">
              {noneSelected
                ? 'Whole class will be exported'
                : `${selected.size} selected`}
            </span>
          </div>
        )}

        <div className="grid max-h-64 grid-cols-1 gap-1 overflow-y-auto rounded-md border-hair p-2 sm:grid-cols-2">
          {students.length === 0 ? (
            <p className="t-body text-[var(--text-muted)]">No students enrolled.</p>
          ) : (
            students.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-2 rounded px-2 py-1 t-body-sm hover:bg-[var(--surface-sunken)]"
              >
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                />
                <span className="truncate">{s.name}</span>
                <span className="ml-auto truncate t-caption text-[var(--text-muted)]">
                  {s.email}
                </span>
              </label>
            ))
          )}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={triggerDownload}
            disabled={students.length === 0}
          >
            Download .xlsx
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
