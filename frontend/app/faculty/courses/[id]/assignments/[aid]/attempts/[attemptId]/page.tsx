'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Card, CardContent } from '@/components/ora';
import { QuestionReview } from '@/components/question-review';
import { quiz, type QuizAttemptDetail } from '@/lib/api';

export default function FacultyAttemptDetailPage() {
  const params = useParams<{ id: string; aid: string; attemptId: string }>();
  const courseId = Number(params.id);
  const aid = Number(params.aid);
  const attemptId = Number(params.attemptId);

  const [detail, setDetail] = useState<QuizAttemptDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(aid) || !Number.isFinite(attemptId)) return;
    quiz
      .attemptDetail(aid, attemptId)
      .then(setDetail)
      .catch((err: Error) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [aid, attemptId]);

  const backHref = `/faculty/courses/${courseId}/assignments/${aid}/leaderboard`;

  if (loading)
    return <p className="t-body text-[var(--text-secondary)]">Loading…</p>;

  if (error)
    return (
      <div className="space-y-4">
        <Link
          href={backHref}
          className="text-xs text-[var(--text-secondary)] hover:underline"
        >
          ← Back to leaderboard
        </Link>
        <p className="t-body text-[var(--danger-fg)]">{error}</p>
      </div>
    );

  if (!detail)
    return <p className="t-body text-[var(--text-secondary)]">No data.</p>;

  const pct =
    detail.max_score && detail.max_score > 0
      ? Math.round(((detail.score ?? 0) / detail.max_score) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={backHref}
          className="text-xs text-[var(--text-secondary)] hover:underline"
        >
          ← Back to leaderboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">
          {detail.student_name ?? `Student #${detail.student_id}`}
        </h1>
        <p className="t-caption text-[var(--text-muted)]">
          Attempt #{detail.attempt_id}
          {detail.submitted_at
            ? ` · Submitted ${new Date(detail.submitted_at).toLocaleString()}`
            : ' · In progress'}
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 py-4">
          <div className="space-y-1">
            <p className="t-caption text-[var(--text-muted)]">Score</p>
            <p className="text-3xl font-bold text-[var(--ink)]">
              {detail.score ?? 0}
              <span className="text-lg text-[var(--text-muted)]">
                /{detail.max_score ?? 0}
              </span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="t-caption text-[var(--text-muted)]">Percentage</p>
            <p className="text-3xl font-bold text-[var(--ember)]">{pct}%</p>
          </div>
          <div className="space-y-1">
            <p className="t-caption text-[var(--text-muted)]">Questions</p>
            <p className="text-3xl font-bold text-[var(--ink)]">
              {detail.questions.length}
            </p>
          </div>
        </CardContent>
      </Card>

      <QuestionReview
        questions={detail.questions}
        answers={detail.answers}
        caption="Correct answers are highlighted. Student selections are marked."
      />
    </div>
  );
}
