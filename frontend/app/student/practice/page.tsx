'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ora';
import {
  coding,
  codingLanguageLabel,
  type CodingAssessmentBrief,
  type CodingDifficulty,
  type CodingLanguage,
  type PracticeStats,
} from '@/lib/api';

const DIFFICULTY_TONE: Record<CodingDifficulty, 'success' | 'warning' | 'danger'> = {
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
};

const LANG_FILTER: (CodingLanguage | 'all')[] = [
  'all',
  'python',
  'c',
  'cpp',
  'java',
  'javascript',
];

export default function StudentPracticePage() {
  const [items, setItems] = useState<CodingAssessmentBrief[]>([]);
  const [stats, setStats] = useState<PracticeStats | null>(null);
  const [difficulty, setDifficulty] = useState<CodingDifficulty | 'all'>('all');
  const [language, setLanguage] = useState<CodingLanguage | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      coding.listPractice({
        difficulty: difficulty === 'all' ? undefined : difficulty,
        language: language === 'all' ? undefined : language,
      }),
      coding.practiceStats().catch(() => null),
    ])
      .then(([list, s]) => {
        setItems(list);
        if (s) setStats(s);
        setError(null);
      })
      .catch((err: Error) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [difficulty, language]);

  const solvedPct = useMemo(
    () =>
      items.length === 0
        ? 0
        : Math.round(
            (items.filter((i) => i.solved).length / items.length) * 100,
          ),
    [items],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Practice</h1>
          <p className="t-body text-[var(--text-secondary)]">
            Solve coding problems, earn points. Unlimited attempts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {stats && (
            <div className="rounded-md border-hair bg-[var(--surface-raised)] px-3 py-2">
              <p className="t-caption text-[var(--text-muted)]">Total points</p>
              <p className="text-xl font-semibold text-[var(--ember)]">
                {stats.total_points}
              </p>
            </div>
          )}
          <div className="rounded-md border-hair bg-[var(--surface-raised)] px-3 py-2">
            <p className="t-caption text-[var(--text-muted)]">Progress</p>
            <p className="text-xl font-semibold">{solvedPct}%</p>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="t-caption text-[var(--text-secondary)]">
            Difficulty
          </span>
          {(['all', 'easy', 'medium', 'hard'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={`rounded-full border-hair px-3 py-1 t-caption font-medium transition-colors ${
                difficulty === d
                  ? 'bg-[var(--ember)] text-[var(--ember-ink)]'
                  : 'bg-[var(--surface-sunken)] text-[var(--text-secondary)]'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="t-caption text-[var(--text-secondary)]">
            Language
          </span>
          <select
            value={language}
            onChange={(e) =>
              setLanguage(e.target.value as CodingLanguage | 'all')
            }
            className="rounded-md border-hair bg-[var(--surface-raised)] px-2 py-1 t-body focus-ora"
          >
            {LANG_FILTER.map((l) => (
              <option key={l} value={l}>
                {l === 'all' ? 'All' : codingLanguageLabel(l as CodingLanguage)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="t-body text-[var(--text-secondary)]">Loading…</p>
      ) : error ? (
        <p className="t-caption text-[var(--danger-fg)]">{error}</p>
      ) : items.length === 0 ? (
        <p className="t-body text-[var(--text-muted)]">
          No practice problems match your filters.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <Link
              key={p.id}
              href={`/student/practice/${p.id}`}
              className="focus-ora rounded-lg"
            >
              <Card className="h-full transition-colors hover:border-[var(--ember)]">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{p.title}</CardTitle>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {p.difficulty && (
                        <Badge tone={DIFFICULTY_TONE[p.difficulty]}>
                          {p.difficulty}
                        </Badge>
                      )}
                      <Badge tone="ember">{p.points} pts</Badge>
                    </div>
                  </div>
                  <CardDescription>
                    {p.allowed_languages.length} language
                    {p.allowed_languages.length === 1 ? '' : 's'} ·{' '}
                    {p.attempts_used ?? 0} attempt
                    {(p.attempts_used ?? 0) === 1 ? '' : 's'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {p.allowed_languages.slice(0, 3).map((l) => (
                      <Badge key={l} tone="neutral">
                        {l}
                      </Badge>
                    ))}
                    {p.allowed_languages.length > 3 && (
                      <Badge tone="neutral">
                        +{p.allowed_languages.length - 3}
                      </Badge>
                    )}
                  </div>
                  {p.solved && <Badge tone="success">Solved</Badge>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
