'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ora';
import {
  quiz,
  type QuizAttemptResult,
  type QuizAttemptStart,
} from '@/lib/api';

export default function QuizAttemptPage() {
  const params = useParams<{ id: string; aid: string }>();
  const courseId = Number(params.id);
  const aid = Number(params.aid);

  const [attempt, setAttempt] = useState<QuizAttemptStart | null>(null);
  const [selections, setSelections] = useState<Record<number, Set<number>>>({});
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(aid)) return;
    quiz
      .startAttempt(aid)
      .then((a) => {
        setAttempt(a);
        if (a.submitted_at) {
          setError('You have already submitted this quiz.');
        }
      })
      .catch((err: Error) =>
        setError(err.message || 'Failed to start attempt'),
      )
      .finally(() => setLoading(false));
  }, [aid]);

  const question = attempt?.questions[idx];
  const total = attempt?.questions.length ?? 0;
  const progress = useMemo(
    () => (total > 0 ? Math.round(((idx + 1) / total) * 100) : 0),
    [idx, total],
  );

  const toggle = (qid: number, optId: number) => {
    setSelections((prev) => {
      const next = new Set(prev[qid] ?? []);
      if (next.has(optId)) next.delete(optId);
      else next.add(optId);
      return { ...prev, [qid]: next };
    });
  };

  const submit = async () => {
    if (!attempt) return;
    setError(null);
    setSubmitting(true);
    try {
      const payload = attempt.questions.map((q) => ({
        question_id: q.id,
        option_ids: Array.from(selections[q.id] ?? []),
      }));
      const res = await quiz.submitAttempt(aid, attempt.attempt_id, payload);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return <p className="t-body text-[var(--text-secondary)]">Loading…</p>;

  if (error && !attempt)
    return (
      <div className="space-y-4">
        <Link
          href={`/student/courses/${courseId}/assignments`}
          className="text-xs text-[var(--text-secondary)] hover:underline"
        >
          ← Back
        </Link>
        <p className="t-body text-[var(--danger-fg)]">{error}</p>
      </div>
    );

  if (result && attempt) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Quiz submitted</CardTitle>
            <CardDescription>
              You scored {result.score} / {result.max_score}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {attempt.questions.map((q, i) => {
              const ans = result.answers.find((a) => a.question_id === q.id);
              if (!ans) return null;
              return (
                <div key={q.id} className="space-y-2 rounded-md border-hair p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="t-body font-medium">
                      Q{i + 1}. {q.question_text}
                    </p>
                    <span
                      className={`t-caption font-semibold ${
                        ans.is_correct
                          ? 'text-[var(--ember)]'
                          : 'text-[var(--danger-fg)]'
                      }`}
                    >
                      {ans.points_earned}/{ans.points_max}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {q.options.map((o) => {
                      const picked = ans.selected_option_ids.includes(o.id);
                      const isRight = ans.correct_option_ids.includes(o.id);
                      return (
                        <li
                          key={o.id}
                          className={`flex items-center gap-2 t-body ${
                            isRight ? 'text-[var(--ember)]' : ''
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full border ${
                              picked
                                ? 'border-[var(--ember)] bg-[var(--ember)]'
                                : 'border-[var(--text-muted)]'
                            }`}
                          />
                          <span>{o.option_text}</span>
                          {isRight && (
                            <span className="t-caption">correct</span>
                          )}
                          {picked && !isRight && (
                            <span className="t-caption text-[var(--danger-fg)]">
                              your pick
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            <div className="pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  window.location.href = `/student/courses/${courseId}/assignments`;
                }}
              >
                Back to assignments
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!attempt || !question)
    return <p className="t-body text-[var(--text-secondary)]">No quiz data.</p>;

  const selected = selections[question.id] ?? new Set<number>();
  const answeredCount = Object.values(selections).filter(
    (s) => s.size > 0,
  ).length;
  const isLast = idx === total - 1;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href={`/student/courses/${courseId}/assignments`}
        className="text-xs text-[var(--text-secondary)] hover:underline"
      >
        ← Exit (progress not saved)
      </Link>

      <div className="space-y-1">
        <p className="t-caption text-[var(--text-muted)]">
          Question {idx + 1} of {total} · {answeredCount} answered
        </p>
        <div className="h-1 w-full overflow-hidden rounded bg-[var(--surface-sunken)]">
          <div
            className="h-full bg-[var(--ember)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{question.question_text}</CardTitle>
          <CardDescription>
            {question.points} pt{question.points !== 1 ? 's' : ''} · select all that apply
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {question.options.map((o) => (
            <label
              key={o.id}
              className={`flex cursor-pointer items-center gap-3 rounded-md border-hair p-3 transition-colors ${
                selected.has(o.id)
                  ? 'bg-[var(--ember)]/10 border-[var(--ember)]'
                  : 'bg-[var(--surface-raised)]'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(o.id)}
                onChange={() => toggle(question.id, o.id)}
              />
              <span className="t-body">{o.option_text}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {error && <p className="t-caption text-[var(--danger-fg)]">{error}</p>}

      <div className="flex justify-between">
        <Button
          variant="secondary"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
        >
          Previous
        </Button>
        {isLast ? (
          <Button
            variant="primary"
            onClick={submit}
            disabled={submitting}
            loading={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit quiz'}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
