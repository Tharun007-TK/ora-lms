'use client';

import { useEffect, useState } from 'react';

import { ProblemCard } from '@/components/problem-card';
import { judge, type JudgeProblemBrief, type ProblemDifficulty } from '@/lib/api';

const FILTERS: (ProblemDifficulty | 'all')[] = ['all', 'easy', 'medium', 'hard'];

export default function StudentJudgePage() {
  const [items, setItems] = useState<JudgeProblemBrief[]>([]);
  const [filter, setFilter] = useState<ProblemDifficulty | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    judge
      .problems()
      .then((data) => !cancelled && setItems(data))
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = items.filter(
    (p) => filter === 'all' || p.difficulty === filter,
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Code Judge</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Pick a problem and submit your solution. Verdicts show AC / WA / TLE
          / RE / CE.
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
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No problems match.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProblemCard
              key={p.id}
              problem={p}
              href={`/student/judge/${p.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
