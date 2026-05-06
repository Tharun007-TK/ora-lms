'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ora';
import {
  quiz,
  type QuizAttemptAnswer,
  type QuizAttemptResult,
  type QuizAttemptStart,
  type QuizQuestionStudent,
} from '@/lib/api';

const CIRC = 2 * Math.PI * 40;

function QuestionReview({
  questions,
  answers,
}: {
  questions: QuizQuestionStudent[];
  answers: QuizAttemptAnswer[];
}) {
  const ansByQid = new Map<number, QuizAttemptAnswer>();
  for (const a of answers) ansByQid.set(a.question_id, a);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Answer review</CardTitle>
        <p className="t-caption text-[var(--text-muted)]">
          Correct answers are highlighted. Your picks are marked.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map((q, qi) => {
          const ans = ansByQid.get(q.id);
          const correctIds = new Set(ans?.correct_option_ids ?? []);
          const pickedIds = new Set(ans?.selected_option_ids ?? []);
          const isCorrect = !!ans?.is_correct;
          return (
            <div key={q.id} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="t-body font-medium text-[var(--ink)]">
                  {qi + 1}. {q.question_text}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 t-caption font-semibold ${
                    isCorrect
                      ? 'bg-[var(--ember)]/10 text-[var(--ember)]'
                      : 'bg-[var(--danger-fg)]/10 text-[var(--danger-fg)]'
                  }`}
                >
                  {ans?.points_earned ?? 0}/{ans?.points_max ?? q.points} pt
                </span>
              </div>
              <ul className="space-y-1">
                {q.options.map((o) => {
                  const isCorrectOpt = correctIds.has(o.id);
                  const isPicked = pickedIds.has(o.id);
                  const tone = isCorrectOpt
                    ? 'border-[var(--ember)] bg-[var(--ember)]/5'
                    : isPicked
                      ? 'border-[var(--danger-fg)] bg-[var(--danger-fg)]/5'
                      : 'border-[var(--border-subtle)]';
                  return (
                    <li
                      key={o.id}
                      className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${tone}`}
                    >
                      <span className="t-body">{o.option_text}</span>
                      <span className="t-caption shrink-0 font-medium">
                        {isCorrectOpt && (
                          <span className="text-[var(--ember)]">
                            ✓ correct
                          </span>
                        )}
                        {isPicked && !isCorrectOpt && (
                          <span className="text-[var(--danger-fg)]">
                            ✗ your pick
                          </span>
                        )}
                        {isPicked && isCorrectOpt && (
                          <span className="ml-2 text-[var(--text-muted)]">
                            (your pick)
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ResultInfographic({
  correct,
  wrong,
  score,
  maxScore,
  total,
  courseId,
  questions,
  answers,
}: {
  correct: number;
  wrong: number;
  score: number;
  maxScore: number;
  total: number;
  courseId: number;
  questions?: QuizQuestionStudent[];
  answers?: QuizAttemptAnswer[];
}) {
  const correctPct = total > 0 ? correct / total : 0;
  const wrongPct = total > 0 ? wrong / total : 0;
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8 text-center">
      <div>
        <h1 className="text-2xl font-bold text-[var(--ink)]">Quiz Complete</h1>
        <p className="t-caption mt-1 text-[var(--text-muted)]">Your results are in</p>
      </div>

      {/* Donut ring */}
      <div className="relative mx-auto h-40 w-40">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50" cy="50" r="40" fill="none"
            stroke="var(--surface-sunken)" strokeWidth="12"
          />
          <circle
            cx="50" cy="50" r="40" fill="none"
            stroke="var(--ember)" strokeWidth="12"
            strokeDasharray={`${correctPct * CIRC} ${CIRC}`}
            strokeLinecap="round"
          />
          <circle
            cx="50" cy="50" r="40" fill="none"
            stroke="var(--danger-fg)" strokeWidth="12"
            strokeDasharray={`${wrongPct * CIRC} ${CIRC}`}
            strokeDashoffset={`${-correctPct * CIRC}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-[var(--ink)]">{pct}%</span>
          <span className="t-caption text-[var(--text-muted)]">score</span>
        </div>
      </div>

      {/* Correct / Wrong / Skipped */}
      <div className="flex justify-center gap-8">
        <div className="space-y-1">
          <p className="text-4xl font-bold text-[var(--ember)]">{correct}</p>
          <p className="t-caption text-[var(--text-muted)]">Correct</p>
        </div>
        <div className="h-12 w-px bg-[var(--border-subtle)]" />
        <div className="space-y-1">
          <p className="text-4xl font-bold text-[var(--danger-fg)]">{wrong}</p>
          <p className="t-caption text-[var(--text-muted)]">Wrong</p>
        </div>
        <div className="h-12 w-px bg-[var(--border-subtle)]" />
        <div className="space-y-1">
          <p className="text-4xl font-bold text-[var(--text-muted)]">
            {Math.max(0, total - correct - wrong)}
          </p>
          <p className="t-caption text-[var(--text-muted)]">Skipped</p>
        </div>
      </div>

      {/* Marks card */}
      <Card>
        <CardContent className="py-6">
          <p className="t-caption text-[var(--text-muted)]">Total marks</p>
          <p className="mt-1 text-5xl font-bold text-[var(--ink)]">
            {score}
            <span className="text-2xl text-[var(--text-muted)]">/{maxScore}</span>
          </p>
        </CardContent>
      </Card>

      {questions && answers && (
        <div className="text-left">
          <QuestionReview questions={questions} answers={answers} />
        </div>
      )}

      <Button
        variant="secondary"
        onClick={() => { window.location.href = `/student/courses/${courseId}/assignments`; }}
      >
        Back to assignments
      </Button>
    </div>
  );
}

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
      .then((a) => setAttempt(a))
      .catch((err: Error) => setError(err.message || 'Failed to start attempt'))
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

  // Already submitted — show infographic + per-question review using
  // answers persisted on the attempt (backed by ux-fixes #1).
  if (attempt?.submitted_at && !result) {
    const correctCount = attempt.correct_count ?? 0;
    const answeredWrong = (attempt.answers ?? []).filter(
      (a) => !a.is_correct && a.selected_option_ids.length > 0,
    ).length;
    const wrongCount = answeredWrong || Math.max(0, total - correctCount);
    return (
      <ResultInfographic
        correct={correctCount}
        wrong={wrongCount}
        score={attempt.score ?? 0}
        maxScore={attempt.max_score}
        total={total}
        courseId={courseId}
        questions={attempt.questions}
        answers={attempt.answers ?? undefined}
      />
    );
  }

  // Just submitted — show infographic from fresh result
  if (result && attempt) {
    const correctCount = result.answers.filter((a) => a.is_correct).length;
    const wrongCount = result.answers.filter(
      (a) => !a.is_correct && a.selected_option_ids.length > 0,
    ).length;
    return (
      <ResultInfographic
        correct={correctCount}
        wrong={wrongCount}
        score={result.score}
        maxScore={result.max_score}
        total={total}
        courseId={courseId}
        questions={attempt.questions}
        answers={result.answers}
      />
    );
  }

  if (!attempt || !question)
    return <p className="t-body text-[var(--text-secondary)]">No quiz data.</p>;

  const selected = selections[question.id] ?? new Set<number>();
  const answeredCount = Object.values(selections).filter((s) => s.size > 0).length;
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
          <p className="t-caption text-[var(--text-muted)]">
            {question.points} pt{question.points !== 1 ? 's' : ''} · select all that apply
          </p>
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
