'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ora';
import type { QuizAttemptAnswer, QuizQuestionStudent } from '@/lib/api';

export function QuestionReview({
  questions,
  answers,
  caption,
}: {
  questions: QuizQuestionStudent[];
  answers: QuizAttemptAnswer[];
  /** Override the subtitle under "Answer review". */
  caption?: string;
}) {
  const ansByQid = new Map<number, QuizAttemptAnswer>();
  for (const a of answers) ansByQid.set(a.question_id, a);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Answer review</CardTitle>
        <p className="t-caption text-[var(--text-muted)]">
          {caption ?? 'Correct answers are highlighted. Your picks are marked.'}
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
