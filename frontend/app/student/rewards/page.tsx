'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ora';
import { coding, type Badge, type UserRewards } from '@/lib/api';

export default function StudentRewardsPage() {
  const [rewards, setRewards] = useState<UserRewards | null>(null);
  const [catalog, setCatalog] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([coding.rewards(), coding.badgesCatalog()])
      .then(([r, c]) => {
        setRewards(r);
        setCatalog(c);
      })
      .catch((err: Error) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <p className="t-body text-[var(--text-secondary)]">Loading…</p>;
  if (error)
    return <p className="t-body text-[var(--danger-fg)]">{error}</p>;

  const earnedKeys = new Set((rewards?.badges ?? []).map((b) => b.key));
  const earnedByKey = new Map(rewards?.badges.map((b) => [b.key, b]) ?? []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Rewards</h1>
          <p className="t-body text-[var(--text-secondary)]">
            Stars from practice. Badges from code arena.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="rounded-md border-hair bg-[var(--surface-raised)] px-3 py-2">
            <p className="t-caption text-[var(--text-muted)]">Total stars</p>
            <p className="text-2xl font-semibold text-[var(--warning-fg)]">
              ⭐ {rewards?.total_stars ?? 0}
            </p>
          </div>
          <div className="rounded-md border-hair bg-[var(--surface-raised)] px-3 py-2">
            <p className="t-caption text-[var(--text-muted)]">Badges</p>
            <p className="text-2xl font-semibold">
              🏅 {rewards?.badges.length ?? 0} / {catalog.length}
            </p>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="t-caption font-semibold uppercase tracking-wide text-[var(--ember)]">
          Badges
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map((b) => {
            const earned = earnedKeys.has(b.key);
            const entry = earnedByKey.get(b.key);
            return (
              <Card
                key={b.key}
                className={earned ? '' : 'opacity-60 grayscale'}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{b.icon}</span>
                    <div className="min-w-0">
                      <CardTitle className="text-base">{b.label}</CardTitle>
                      <CardDescription>{b.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {earned ? (
                    <p className="t-caption text-[var(--success-fg)]">
                      Earned
                      {entry?.earned_at
                        ? ` · ${new Date(entry.earned_at).toLocaleString()}`
                        : ''}
                    </p>
                  ) : (
                    <p className="t-caption text-[var(--text-muted)]">
                      Locked — complete the requirement to unlock.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="t-caption font-semibold uppercase tracking-wide text-[var(--ember)]">
          How to earn more
        </h2>
        <div className="space-y-1 t-body text-[var(--text-secondary)]">
          <p>
            <strong>Stars:</strong> Solve practice problems. 1 star = any
            testcase passes, 2 = all visible pass, 3 = every case passes.
          </p>
          <p>
            <strong>Badges:</strong> Complete code arena (graded) assessments
            without tab switches, with full score, and across multiple
            problems.
          </p>
          <p>
            <Link
              href="/student/practice"
              className="text-[var(--ember)] hover:underline"
            >
              Go to Practice →
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
