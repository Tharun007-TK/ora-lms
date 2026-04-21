'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@/components/ora';
import {
  assignments,
  quiz,
  type QuizAttemptSummary,
  type QuizQuestionFaculty,
} from '@/lib/api';

interface DraftOption {
  option_text: string;
  is_correct: boolean;
}

interface DraftQuestion {
  question_text: string;
  points: number;
  options: DraftOption[];
}

const EMPTY_DRAFT: DraftQuestion = {
  question_text: '',
  points: 1,
  options: [
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
  ],
};

export default function QuizEditPage() {
  const params = useParams<{ id: string; aid: string }>();
  const courseId = Number(params.id);
  const aid = Number(params.aid);

  const [questions, setQuestions] = useState<QuizQuestionFaculty[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptSummary[]>([]);
  const [attemptsLocked, setAttemptsLocked] = useState(false);
  const [draft, setDraft] = useState<DraftQuestion>({
    ...EMPTY_DRAFT,
    options: EMPTY_DRAFT.options.map((o) => ({ ...o })),
  });
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');

  const load = async () => {
    try {
      const [qs, as, assignment] = await Promise.all([
        quiz.listQuestions(aid),
        quiz.listAttempts(aid),
        assignments.get(aid),
      ]);
      setQuestions(qs);
      setAttempts(as);
      setAttemptsLocked(as.length > 0);
      setTitle(assignment.title);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Number.isFinite(aid)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aid]);

  const addOption = () => {
    if (draft.options.length >= 6) return;
    setDraft({
      ...draft,
      options: [...draft.options, { option_text: '', is_correct: false }],
    });
  };
  const removeOption = (i: number) => {
    if (draft.options.length <= 2) return;
    setDraft({
      ...draft,
      options: draft.options.filter((_, idx) => idx !== i),
    });
  };
  const updateOption = (i: number, patch: Partial<DraftOption>) => {
    setDraft({
      ...draft,
      options: draft.options.map((o, idx) =>
        idx === i ? { ...o, ...patch } : o,
      ),
    });
  };

  const save = async () => {
    setError(null);
    if (!draft.question_text.trim()) {
      setError('Question text required.');
      return;
    }
    const cleanOpts = draft.options.filter((o) => o.option_text.trim());
    if (cleanOpts.length < 2) {
      setError('At least 2 non-empty options required.');
      return;
    }
    if (!cleanOpts.some((o) => o.is_correct)) {
      setError('Mark at least one correct option.');
      return;
    }
    setSaving(true);
    try {
      await quiz.createQuestion(aid, {
        question_text: draft.question_text,
        points: draft.points,
        position: questions.length,
        options: cleanOpts,
      });
      setDraft({
        ...EMPTY_DRAFT,
        options: EMPTY_DRAFT.options.map((o) => ({ ...o })),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const removeQuestion = async (qid: number) => {
    if (!confirm('Delete this question?')) return;
    setError(null);
    try {
      await quiz.deleteQuestion(aid, qid);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  if (loading)
    return <p className="t-body text-[var(--text-secondary)]">Loading…</p>;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/faculty/assessments"
          className="text-xs text-[var(--text-secondary)] hover:underline"
        >
          ← Back to assessments
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Quiz: {title}</h1>
          <Button variant="secondary" onClick={() => setPreview((p) => !p)}>
            {preview ? 'Exit preview' : 'Preview as student'}
          </Button>
        </div>
        {attemptsLocked && (
          <p className="t-caption text-[var(--danger-fg)]">
            Edits locked — {attempts.length} student(s) have started this quiz.
          </p>
        )}
      </header>

      {error && <p className="t-caption text-[var(--danger-fg)]">{error}</p>}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ember)]">
          Questions ({questions.length})
        </h2>
        {questions.length === 0 && (
          <p className="t-body text-[var(--text-muted)]">No questions yet.</p>
        )}
        {questions.map((q, idx) => (
          <Card key={q.id}>
            <CardHeader>
              <CardTitle className="text-base">
                Q{idx + 1}. {q.question_text}
              </CardTitle>
              <CardDescription>
                {q.points} pt{q.points !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <ul className="space-y-1">
                {q.options.map((o) => (
                  <li key={o.id} className="flex items-center gap-2 t-body">
                    <span
                      className={`inline-block h-4 w-4 rounded-full border ${
                        preview
                          ? 'border-[var(--text-muted)]'
                          : o.is_correct
                          ? 'border-[var(--ember)] bg-[var(--ember)]'
                          : 'border-[var(--text-muted)]'
                      }`}
                    />
                    <span>{o.option_text}</span>
                    {!preview && o.is_correct && (
                      <span className="t-caption text-[var(--ember)]">
                        correct
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {!preview && !attemptsLocked && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(q.id)}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      {!preview && !attemptsLocked && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ember)]">
            Add question
          </h2>
          <Card>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="q-text">Question</Label>
                <textarea
                  id="q-text"
                  rows={2}
                  value={draft.question_text}
                  onChange={(e) =>
                    setDraft({ ...draft, question_text: e.target.value })
                  }
                  className="flex w-full rounded-md border-hair bg-[var(--surface-raised)] px-3 py-2 text-sm focus-ora"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="q-points">Points</Label>
                <Input
                  id="q-points"
                  type="number"
                  min={1}
                  max={100}
                  value={draft.points}
                  onChange={(e) =>
                    setDraft({ ...draft, points: Number(e.target.value) || 1 })
                  }
                  className="w-24"
                />
              </div>
              <div className="space-y-2">
                <Label>Options</Label>
                <p className="t-caption text-[var(--text-muted)]">
                  Tick every correct option. Multi-correct allowed.
                </p>
                {draft.options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={o.is_correct}
                      onChange={(e) =>
                        updateOption(i, { is_correct: e.target.checked })
                      }
                      aria-label={`Option ${i + 1} correct`}
                    />
                    <Input
                      value={o.option_text}
                      onChange={(e) =>
                        updateOption(i, { option_text: e.target.value })
                      }
                      placeholder={`Option ${i + 1}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(i)}
                      disabled={draft.options.length <= 2}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={addOption}
                  disabled={draft.options.length >= 6}
                >
                  Add option
                </Button>
              </div>
              <div className="flex justify-end">
                <Button onClick={save} disabled={saving} loading={saving}>
                  {saving ? 'Adding…' : 'Add question'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {attempts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ember)]">
            Attempts ({attempts.length})
          </h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Student</TH>
                    <TH>Started</TH>
                    <TH>Submitted</TH>
                    <TH>Score</TH>
                  </TR>
                </THead>
                <TBody>
                  {attempts.map((a) => (
                    <TR key={a.id}>
                      <TD>{a.student_name ?? `#${a.student_id}`}</TD>
                      <TD className="text-[var(--text-secondary)]">
                        {new Date(a.started_at).toLocaleString()}
                      </TD>
                      <TD className="text-[var(--text-secondary)]">
                        {a.submitted_at
                          ? new Date(a.submitted_at).toLocaleString()
                          : '—'}
                      </TD>
                      <TD>
                        {a.score != null
                          ? `${a.score}/${a.max_score ?? 0}`
                          : '—'}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
