'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ora';
import { coding, type CodingLeaderboardEntry } from '@/lib/api';

export default function CodingLeaderboardPage() {
  const params = useParams<{ id: string; cid: string }>();
  const courseId = Number(params.id);
  const cid = Number(params.cid);

  const [entries, setEntries] = useState<CodingLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(cid)) return;
    coding
      .leaderboard(cid)
      .then(setEntries)
      .catch((err: Error) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [cid]);

  const maxScore = entries[0]?.max_score ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/faculty/assessments"
          className="text-xs text-[var(--text-secondary)] hover:underline"
        >
          ← Back to assessments
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Code Arena Leaderboard</h1>
        {!loading && !error && (
          <p className="t-caption mt-1 text-[var(--text-muted)]">
            {entries.length} student{entries.length !== 1 ? 's' : ''} attempted
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      ) : error ? (
        <p className="text-sm text-[var(--danger-fg)]">{error}</p>
      ) : entries.length === 0 ? (
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
                  <th className="px-4 py-3 t-caption text-[var(--text-muted)] text-right">
                    Best score
                  </th>
                  <th className="px-4 py-3 t-caption text-[var(--text-muted)] text-right">%</th>
                  <th className="px-4 py-3 t-caption text-[var(--text-muted)] text-right">
                    Attempts
                  </th>
                  <th className="px-4 py-3 t-caption text-[var(--text-muted)]">Last submit</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => {
                  const pct =
                    maxScore > 0 ? Math.round((e.best_score / maxScore) * 100) : 0;
                  return (
                    <tr
                      key={e.student_id}
                      className={`border-b border-[var(--border-subtle)] last:border-0 ${
                        i === 0 ? 'bg-[var(--ember)]/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold text-[var(--text-muted)]">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--ink)]">
                        {e.student_name ?? `Student #${e.student_id}`}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--ink)]">
                        {e.best_score}/{maxScore}
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
                      <td className="px-4 py-3 text-right text-[var(--text-muted)]">
                        {e.submissions}
                      </td>
                      <td className="px-4 py-3 t-caption text-[var(--text-muted)]">
                        {new Date(e.last_submitted_at).toLocaleDateString()}
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
