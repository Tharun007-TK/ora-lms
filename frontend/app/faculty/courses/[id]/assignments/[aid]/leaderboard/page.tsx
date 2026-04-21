'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ora';
import { quiz, type QuizAttemptSummary } from '@/lib/api';

export default function QuizLeaderboardPage() {
  const params = useParams<{ id: string; aid: string }>();
  const courseId = Number(params.id);
  const aid = Number(params.aid);

  const [attempts, setAttempts] = useState<QuizAttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(aid)) return;
    quiz
      .listAttempts(aid)
      .then((data) => {
        const submitted = data
          .filter((a) => a.submitted_at !== null)
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        setAttempts(submitted);
      })
      .catch((err: Error) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [aid]);

  const maxScore = attempts[0]?.max_score ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/faculty/assessments"
          className="text-xs text-[var(--text-secondary)] hover:underline"
        >
          ← Back to assessments
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Quiz Leaderboard</h1>
        {!loading && !error && (
          <p className="t-caption mt-1 text-[var(--text-muted)]">
            {attempts.length} student{attempts.length !== 1 ? 's' : ''} completed
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      ) : error ? (
        <p className="text-sm text-[var(--danger-fg)]">{error}</p>
      ) : attempts.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No submissions yet.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rankings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-left">
                  <th className="px-4 py-3 t-caption text-[var(--text-muted)]">#</th>
                  <th className="px-4 py-3 t-caption text-[var(--text-muted)]">Student</th>
                  <th className="px-4 py-3 t-caption text-[var(--text-muted)] text-right">Score</th>
                  <th className="px-4 py-3 t-caption text-[var(--text-muted)] text-right">%</th>
                  <th className="px-4 py-3 t-caption text-[var(--text-muted)]">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a, i) => {
                  const pct = maxScore > 0 ? Math.round(((a.score ?? 0) / maxScore) * 100) : 0;
                  return (
                    <tr
                      key={a.id}
                      className={`border-b border-[var(--border-subtle)] last:border-0 ${
                        i === 0 ? 'bg-[var(--ember)]/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold text-[var(--text-muted)]">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--ink)]">
                        {a.student_name ?? `Student #${a.student_id}`}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--ink)]">
                        {a.score ?? 0}/{maxScore}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`t-caption font-semibold ${
                            pct >= 75
                              ? 'text-[var(--ember)]'
                              : pct >= 50
                                ? 'text-[var(--text-secondary)]'
                                : 'text-[var(--danger-fg)]'
                          }`}
                        >
                          {pct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 t-caption text-[var(--text-muted)]">
                        {a.submitted_at
                          ? new Date(a.submitted_at).toLocaleDateString()
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
