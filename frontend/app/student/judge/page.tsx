'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ora';
import { ProblemCard } from '@/components/problem-card';
import {
  coding,
  courses,
  judge,
  type CodingAssessmentBrief,
  type CodingDifficulty,
  type JudgeProblemBrief,
  type ProblemDifficulty,
} from '@/lib/api';

const FILTERS: (ProblemDifficulty | 'all')[] = ['all', 'easy', 'medium', 'hard'];

const DIFFICULTY_TONE: Record<
  CodingDifficulty,
  'success' | 'warning' | 'danger'
> = {
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
};

export default function StudentJudgePage() {
  const [legacy, setLegacy] = useState<JudgeProblemBrief[]>([]);
  const [coded, setCoded] = useState<CodingAssessmentBrief[]>([]);
  const [filter, setFilter] = useState<ProblemDifficulty | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const legacyP = judge.problems().catch(() => [] as JudgeProblemBrief[]);
        const practiceP = coding
          .listPractice()
          .catch(() => [] as CodingAssessmentBrief[]);
        const myCourses = await courses
          .list({ mine: true })
          .catch(() => [] as Awaited<ReturnType<typeof courses.list>>);
        const coursePs = myCourses.map((c) =>
          coding.listForCourse(c.id).catch(() => [] as CodingAssessmentBrief[]),
        );
        const [legacyList, practiceList, ...courseLists] = await Promise.all([
          legacyP,
          practiceP,
          ...coursePs,
        ]);
        if (cancelled) return;
        const merged: CodingAssessmentBrief[] = [
          ...practiceList,
          ...courseLists.flat(),
        ];
        const byId = new Map<number, CodingAssessmentBrief>();
        for (const a of merged) byId.set(a.id, a);
        setLegacy(legacyList);
        setCoded(Array.from(byId.values()));
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredLegacy = useMemo(
    () => legacy.filter((p) => filter === 'all' || p.difficulty === filter),
    [legacy, filter],
  );

  const filteredCoded = useMemo(
    () =>
      coded.filter((c) => {
        if (filter === 'all') return true;
        return c.difficulty === filter;
      }),
    [coded, filter],
  );

  const totalVisible = filteredLegacy.length + filteredCoded.length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Code Arena</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Practice problems, course coding assessments, and legacy judge
          problems — all in one place.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs capitalize ${
              filter === f
                ? 'bg-[var(--ember)] text-[var(--ember-ink)]'
                : 'bg-[var(--surface-sunken)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      ) : error ? (
        <p className="text-sm text-[var(--danger-fg)]">{error}</p>
      ) : totalVisible === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No problems match.</p>
      ) : (
        <div className="space-y-8">
          {filteredCoded.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Faculty problems ({filteredCoded.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCoded.map((c) => {
                  const overdue =
                    !c.is_practice &&
                    c.due_date &&
                    new Date(c.due_date).getTime() < Date.now();
                  return (
                    <Link
                      key={`coding-${c.id}`}
                      href={`/student/practice/${c.id}`}
                      className="focus-ora rounded-lg"
                    >
                      <div className="flex h-full flex-col justify-between rounded-lg border-hair bg-[var(--surface-raised)] p-4 transition-colors hover:border-[var(--ember)]">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium">{c.title}</p>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              {c.difficulty && (
                                <Badge tone={DIFFICULTY_TONE[c.difficulty]}>
                                  {c.difficulty}
                                </Badge>
                              )}
                              {c.is_practice ? (
                                <Badge tone="ember">{c.points} pts</Badge>
                              ) : (
                                <Badge tone="neutral">Graded</Badge>
                              )}
                            </div>
                          </div>
                          <p className="t-caption text-[var(--text-secondary)]">
                            {c.course_title ?? 'Practice'} ·{' '}
                            {c.allowed_languages.length} language
                            {c.allowed_languages.length === 1 ? '' : 's'}
                            {c.due_date
                              ? ` · due ${new Date(c.due_date).toLocaleDateString()}`
                              : ''}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="t-caption text-[var(--text-muted)]">
                            {c.attempts_used ?? 0} attempt
                            {(c.attempts_used ?? 0) === 1 ? '' : 's'}
                          </span>
                          <div className="flex gap-1">
                            {overdue && <Badge tone="danger">Overdue</Badge>}
                            {c.solved && <Badge tone="success">Solved</Badge>}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {filteredLegacy.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Judge problems ({filteredLegacy.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredLegacy.map((p) => (
                  <ProblemCard
                    key={`judge-${p.id}`}
                    problem={p}
                    href={`/student/judge/${p.id}`}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
