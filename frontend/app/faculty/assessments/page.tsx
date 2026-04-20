'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ora';
import {
  assignments,
  coding,
  courses,
  type Assignment,
  type CodingAssessmentBrief,
  type CodingDifficulty,
  type Course,
} from '@/lib/api';

type FilterKey = 'all' | 'file' | 'quiz' | 'coding' | 'practice';

interface Row {
  key: string;
  kind: FilterKey;
  title: string;
  courseId: number | null;
  courseTitle: string | null;
  subline: string;
  href: string;
  badge?: {
    tone: 'ember' | 'neutral' | 'success' | 'warning' | 'danger';
    text: string;
  };
  createdAt: string;
}

const DIFFICULTY_TONE: Record<CodingDifficulty, 'success' | 'warning' | 'danger'> = {
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
};

export default function FacultyAssessmentsPage() {
  const [assignmentsList, setAssignmentsList] = useState<Assignment[]>([]);
  const [codingList, setCodingList] = useState<CodingAssessmentBrief[]>([]);
  const [courseMap, setCourseMap] = useState<Record<number, Course>>({});
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const myCourses = await courses.list({ mine: true });
        const map: Record<number, Course> = {};
        for (const c of myCourses) map[c.id] = c;
        setCourseMap(map);
        const [asns, code] = await Promise.all([
          assignments.listMine(),
          coding.listMine(),
        ]);
        setAssignmentsList(asns);
        setCodingList(code);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const rows = useMemo<Row[]>(() => {
    const aRows: Row[] = assignmentsList.map((a) => {
      const kind: FilterKey = a.type === 'quiz' ? 'quiz' : 'file';
      const course = courseMap[a.course_id];
      return {
        key: `a-${a.id}`,
        kind,
        title: a.title,
        courseId: a.course_id,
        courseTitle: course?.title ?? null,
        subline: `${a.max_marks} marks · due ${new Date(a.due_date).toLocaleDateString()}`,
        href:
          a.type === 'quiz'
            ? `/faculty/courses/${a.course_id}/assignments/${a.id}/edit`
            : `/faculty/courses/${a.course_id}/assignments/${a.id}/submissions`,
        badge: {
          tone: a.type === 'quiz' ? 'ember' : 'neutral',
          text: a.type === 'quiz' ? 'Quiz' : 'File',
        },
        createdAt: a.created_at,
      };
    });

    const cRows: Row[] = codingList.map((c) => {
      const kind: FilterKey = c.is_practice ? 'practice' : 'coding';
      const course = c.course_id ? courseMap[c.course_id] : null;
      return {
        key: `c-${c.id}`,
        kind,
        title: c.title,
        courseId: c.course_id,
        courseTitle: c.course_title ?? course?.title ?? null,
        subline: c.is_practice
          ? `${c.points} pts · practice`
          : `${c.max_score} max · due ${
              c.due_date ? new Date(c.due_date).toLocaleDateString() : '—'
            }`,
        href: c.is_practice
          ? `/faculty/assessments`
          : c.course_id
          ? `/faculty/courses/${c.course_id}/assignments`
          : `/faculty/assessments`,
        badge: c.is_practice
          ? {
              tone: c.difficulty ? DIFFICULTY_TONE[c.difficulty] : 'success',
              text: c.difficulty ?? 'practice',
            }
          : { tone: 'warning', text: 'Coding' },
        createdAt: c.created_at,
      };
    });

    const merged = [...aRows, ...cRows];
    merged.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (filter === 'all') return merged;
    return merged.filter((r) => r.kind === filter);
  }, [assignmentsList, codingList, courseMap, filter]);

  const countBy = (k: FilterKey): number => {
    if (k === 'all') return assignmentsList.length + codingList.length;
    if (k === 'file') return assignmentsList.filter((a) => a.type === 'file').length;
    if (k === 'quiz') return assignmentsList.filter((a) => a.type === 'quiz').length;
    if (k === 'coding') return codingList.filter((c) => !c.is_practice).length;
    return codingList.filter((c) => c.is_practice).length;
  };

  const myCourseList = Object.values(courseMap);

  const onDeletePractice = async (id: number) => {
    if (!confirm('Delete this practice problem?')) return;
    await coding.remove(id);
    setCodingList((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Assessments</h1>
          <p className="t-body text-[var(--text-secondary)]">
            All assessments you authored — file assignments, MCQ quizzes, coding, and practice problems.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/faculty/assessments/new">+ New assessment</Link>
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'file', 'quiz', 'coding', 'practice'] as FilterKey[]).map(
          (k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`rounded-full border-hair px-3 py-1 t-caption font-medium transition-colors ${
                filter === k
                  ? 'bg-[var(--ember)] text-[var(--ember-ink)]'
                  : 'bg-[var(--surface-sunken)] text-[var(--text-secondary)]'
              }`}
            >
              {k} · {countBy(k)}
            </button>
          ),
        )}
      </div>

      {loading ? (
        <p className="t-body text-[var(--text-secondary)]">Loading…</p>
      ) : error ? (
        <p className="t-caption text-[var(--danger-fg)]">{error}</p>
      ) : rows.length === 0 ? (
        <p className="t-body text-[var(--text-muted)]">
          No {filter === 'all' ? '' : filter} assessments yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const isPractice = r.kind === 'practice';
            const practiceId =
              isPractice && r.key.startsWith('c-')
                ? Number(r.key.slice(2))
                : null;
            return (
              <Card key={r.key} className="flex h-full flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{r.title}</CardTitle>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {r.badge && (
                        <Badge tone={r.badge.tone}>{r.badge.text}</Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    {r.courseTitle ??
                      (isPractice ? 'Practice (no course)' : '—')}
                    <span className="block t-caption text-[var(--text-muted)]">
                      {r.subline}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between gap-2">
                  {!isPractice ? (
                    <Button asChild variant="secondary" size="sm">
                      <Link href={r.href}>Open</Link>
                    </Button>
                  ) : (
                    <span className="t-caption text-[var(--text-muted)]">
                      Live in /student/practice
                    </span>
                  )}
                  {isPractice && practiceId != null && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeletePractice(practiceId)}
                    >
                      Delete
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
