'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { RichTextEditor } from '@/components/RichTextEditor';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/components/ora';
import {
  coding,
  codingLanguageLabel,
  type CodingDifficulty,
  type CodingLanguage,
  type CodingScoringMode,
} from '@/lib/api';

const ALL_LANGUAGES: CodingLanguage[] = ['python', 'c', 'cpp', 'java', 'javascript'];

interface DraftTest {
  input: string;
  expected_output: string;
  is_hidden: boolean;
  weight: number;
}

const EMPTY_TEST: DraftTest = {
  input: '',
  expected_output: '',
  is_hidden: false,
  weight: 1,
};

export default function NewCodingAssessmentPage() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [languages, setLanguages] = useState<CodingLanguage[]>(['python']);
  const [timeLimit, setTimeLimit] = useState(2);
  const [memLimit, setMemLimit] = useState(256);
  const [durationMinutes, setDurationMinutes] = useState<number | ''>(60);
  const [maxScore, setMaxScore] = useState(100);
  const [scoring, setScoring] = useState<CodingScoringMode>('partial');
  const [due, setDue] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [isPractice, setIsPractice] = useState(false);
  const [difficulty, setDifficulty] = useState<CodingDifficulty>('easy');
  const [points, setPoints] = useState(10);
  const [tests, setTests] = useState<DraftTest[]>([{ ...EMPTY_TEST }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleLang = (l: CodingLanguage) => {
    setLanguages((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l],
    );
  };

  const updateTest = (i: number, patch: Partial<DraftTest>) => {
    setTests(tests.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  };
  const addTest = () => setTests([...tests, { ...EMPTY_TEST }]);
  const removeTest = (i: number) => {
    if (tests.length <= 1) return;
    setTests(tests.filter((_, idx) => idx !== i));
  };

  const submit = async () => {
    setError(null);
    if (!title.trim()) return setError('Title required.');
    if (!description.trim()) return setError('Description required.');
    if (languages.length === 0) return setError('Pick at least one language.');
    const clean = tests.filter(
      (t) => t.input.trim() !== '' || t.expected_output.trim() !== '',
    );
    if (clean.length === 0) return setError('At least one test case required.');
    if (!clean.some((t) => !t.is_hidden))
      return setError('At least one visible test case required.');
    if (!isPractice && !due)
      return setError('Due date required for graded assessment.');

    setSaving(true);
    try {
      const created = await coding.create({
        course_id: isPractice ? null : courseId,
        title,
        description,
        allowed_languages: languages,
        time_limit_seconds: timeLimit,
        memory_limit_mb: memLimit,
        max_score: maxScore,
        scoring_mode: scoring,
        due_date: isPractice ? null : new Date(due).toISOString(),
        max_attempts: maxAttempts,
        is_practice: isPractice,
        points: isPractice ? points : 0,
        difficulty: isPractice ? difficulty : null,
        duration_minutes: isPractice
          ? null
          : typeof durationMinutes === 'number' && durationMinutes > 0
          ? durationMinutes
          : null,
        test_cases: clean.map((t, i) => ({
          input: t.input,
          expected_output: t.expected_output,
          is_hidden: t.is_hidden,
          weight: t.weight,
          order_index: i,
        })),
      });
      if (isPractice) {
        router.replace('/faculty/practice');
      } else {
        router.replace(`/faculty/courses/${courseId}/assignments`);
      }
      router.refresh();
      void created;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/faculty/courses/${courseId}/assignments`}
        className="text-xs text-[var(--text-secondary)] hover:underline"
      >
        ← Back
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New coding assessment</CardTitle>
          <CardDescription>
            Students submit code; test cases auto-grade via Judge0.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={isPractice}
              onChange={(e) => setIsPractice(e.target.checked)}
              className="mt-1"
            />
            <span className="t-body">
              This is a practice problem (ungraded, points-based, visible in
              student Practice section)
              <span className="block t-caption text-[var(--text-muted)]">
                Practice problems aren&apos;t course-bound.
              </span>
            </span>
          </label>

          <div className="space-y-2">
            <Label htmlFor="c-title">Title</Label>
            <Input
              id="c-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Two Sum"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-desc">Problem statement</Label>
            <RichTextEditor
              id="c-desc"
              ariaLabel="Problem statement"
              value={description}
              onChange={setDescription}
              minHeight={200}
              placeholder="Describe the problem, input/output format, constraints, examples…"
            />
            <p className="t-caption text-[var(--text-muted)]">
              Use the toolbar to format text — headings, lists, bold, links, code.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Allowed languages</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_LANGUAGES.map((l) => {
                const on = languages.includes(l);
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => toggleLang(l)}
                    className={`rounded-full border-hair px-3 py-1 t-caption font-medium transition-colors ${
                      on
                        ? 'bg-[var(--ember)] text-[var(--ember-ink)]'
                        : 'bg-[var(--surface-sunken)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {codingLanguageLabel(l)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-time">Time limit (s)</Label>
              <Input
                id="c-time"
                type="number"
                min={1}
                max={30}
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value) || 2)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-mem">Memory (MB)</Label>
              <Input
                id="c-mem"
                type="number"
                min={32}
                max={1024}
                value={memLimit}
                onChange={(e) => setMemLimit(Number(e.target.value) || 256)}
              />
            </div>
          </div>

          {!isPractice && (
            <div className="space-y-2">
              <Label htmlFor="c-dur">Exam duration (minutes)</Label>
              <Input
                id="c-dur"
                type="number"
                min={1}
                max={600}
                value={durationMinutes}
                onChange={(e) => {
                  const v = e.target.value;
                  setDurationMinutes(v === '' ? '' : Number(v) || 1);
                }}
              />
              <p className="t-caption text-[var(--text-muted)]">
                Countdown shown to student in fullscreen. Auto-submits at zero.
              </p>
            </div>
          )}

          {isPractice ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="c-diff">Difficulty</Label>
                <select
                  id="c-diff"
                  value={difficulty}
                  onChange={(e) =>
                    setDifficulty(e.target.value as CodingDifficulty)
                  }
                  className="flex h-8 w-full rounded-md border-hair bg-[var(--surface-raised)] px-3 t-body focus-ora"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-pts">Points</Label>
                <Input
                  id="c-pts"
                  type="number"
                  min={1}
                  max={1000}
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value) || 10)}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="c-due">Due date</Label>
                <Input
                  id="c-due"
                  type="datetime-local"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-max">Max attempts</Label>
                <Input
                  id="c-max"
                  type="number"
                  min={1}
                  max={50}
                  value={maxAttempts}
                  onChange={(e) =>
                    setMaxAttempts(Number(e.target.value) || 3)
                  }
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-score">Max score</Label>
              <Input
                id="c-score"
                type="number"
                min={1}
                max={1000}
                value={maxScore}
                onChange={(e) => setMaxScore(Number(e.target.value) || 100)}
              />
            </div>
            <div className="space-y-2">
              <Label>Scoring</Label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 t-body">
                  <input
                    type="radio"
                    checked={scoring === 'all_or_nothing'}
                    onChange={() => setScoring('all_or_nothing')}
                  />
                  All-or-nothing per test case
                </label>
                <label className="flex items-center gap-2 t-body">
                  <input
                    type="radio"
                    checked={scoring === 'partial'}
                    onChange={() => setScoring('partial')}
                  />
                  Partial credit
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test cases</CardTitle>
          <CardDescription>
            At least one visible (not hidden) case required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tests.map((t, i) => (
            <div key={i} className="space-y-2 rounded-md border-hair p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="t-caption font-semibold">
                  Test case {i + 1}
                </span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 t-caption">
                    <input
                      type="checkbox"
                      checked={t.is_hidden}
                      onChange={(e) =>
                        updateTest(i, { is_hidden: e.target.checked })
                      }
                    />
                    Hidden
                  </label>
                  <Badge tone={t.is_hidden ? 'warning' : 'success'}>
                    {t.is_hidden ? 'hidden' : 'visible'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTest(i)}
                    disabled={tests.length <= 1}
                  >
                    ×
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Input (stdin)</Label>
                  <textarea
                    rows={3}
                    value={t.input}
                    onChange={(e) => updateTest(i, { input: e.target.value })}
                    className="flex w-full rounded-md border-hair bg-[var(--surface-raised)] px-2 py-1 font-mono text-xs focus-ora"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Expected output</Label>
                  <textarea
                    rows={3}
                    value={t.expected_output}
                    onChange={(e) =>
                      updateTest(i, { expected_output: e.target.value })
                    }
                    className="flex w-full rounded-md border-hair bg-[var(--surface-raised)] px-2 py-1 font-mono text-xs focus-ora"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Weight</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={t.weight}
                  onChange={(e) =>
                    updateTest(i, { weight: Number(e.target.value) || 1 })
                  }
                  className="w-20"
                />
              </div>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={addTest}>
            + Add test case
          </Button>
        </CardContent>
      </Card>

      {error && <p className="t-caption text-[var(--danger-fg)]">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={saving} loading={saving}>
          {saving ? 'Creating…' : 'Create assessment'}
        </Button>
      </div>
    </div>
  );
}
