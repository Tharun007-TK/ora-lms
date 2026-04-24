'use client';

import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
} from '@/components/ora';
import {
  coding,
  codingLanguageLabel,
  courses,
  type CodingDifficulty,
  type CodingLanguage,
  type CodingScoringMode,
  type Course,
} from '@/lib/api';

type Tab = 'problem' | 'tests' | 'languages' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'problem', label: 'Problem' },
  { id: 'tests', label: 'Test Cases' },
  { id: 'languages', label: 'Languages' },
  { id: 'settings', label: 'Settings' },
];

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
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('problem');

  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [isPractice, setIsPractice] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [tests, setTests] = useState<DraftTest[]>([
    { ...EMPTY_TEST },
    { ...EMPTY_TEST, is_hidden: true },
  ]);

  const [languages, setLanguages] = useState<CodingLanguage[]>(['python']);

  const [timeLimit, setTimeLimit] = useState(2);
  const [memLimit, setMemLimit] = useState(256);
  const [durationMinutes, setDurationMinutes] = useState<number | ''>(60);
  const [maxScore, setMaxScore] = useState(100);
  const [scoring, setScoring] = useState<CodingScoringMode>('partial');
  const [due, setDue] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [difficulty, setDifficulty] = useState<CodingDifficulty>('easy');
  const [points, setPoints] = useState(10);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    courses
      .list({ mine: true })
      .then((list) => {
        setMyCourses(list);
        if (list[0]) setCourseId(list[0].id);
      })
      .catch((err: Error) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const toggleLang = (l: CodingLanguage) => {
    setLanguages((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l],
    );
  };

  const updateTest = (i: number, patch: Partial<DraftTest>) => {
    setTests(tests.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  };
  const addTest = (hidden = false) =>
    setTests([...tests, { ...EMPTY_TEST, is_hidden: hidden }]);
  const removeTest = (i: number) => {
    if (tests.length <= 1) return;
    setTests(tests.filter((_, idx) => idx !== i));
  };

  const tabProgress: Record<Tab, boolean> = {
    problem: !!title.trim() && !!description.trim(),
    tests:
      tests.some((t) => t.input.trim() && t.expected_output.trim()) &&
      tests.some(
        (t) => !t.is_hidden && t.input.trim() && t.expected_output.trim(),
      ),
    languages: languages.length > 0,
    settings: isPractice ? points > 0 : !!due,
  };

  const submit = async () => {
    setError(null);
    if (!title.trim()) return setError('Title required (Problem tab).');
    if (!description.trim())
      return setError('Description required (Problem tab).');
    if (languages.length === 0)
      return setError('Pick at least one language (Languages tab).');
    const clean = tests.filter(
      (t) => t.input.trim() !== '' || t.expected_output.trim() !== '',
    );
    if (clean.length === 0)
      return setError('At least one test case required (Test Cases tab).');
    if (!clean.some((t) => !t.is_hidden))
      return setError('At least one visible test case required.');
    if (!isPractice && !due)
      return setError('Due date required for graded assessment (Settings tab).');
    if (!isPractice && courseId == null) return setError('Pick a course.');

    setSaving(true);
    try {
      await coding.create({
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
      router.replace('/faculty/assessments');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <p className="t-body text-[var(--text-secondary)]">Loading…</p>;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link
            href="/faculty/assessments/new"
            className="text-xs text-[var(--text-secondary)] hover:underline"
          >
            ← Back
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            New coding problem
            {isPractice && <Badge tone="ember">Practice</Badge>}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} loading={saving}>
            {saving ? 'Posting…' : 'Post problem'}
          </Button>
        </div>
      </header>

      <label className="flex items-center gap-2 rounded-md border-hair bg-[var(--surface-raised)] p-3">
        <input
          type="checkbox"
          checked={isPractice}
          onChange={(e) => setIsPractice(e.target.checked)}
        />
        <span className="t-body">
          Post as <strong>practice problem</strong> (ungraded, points-based,
          visible to all students)
        </span>
      </label>

      <div className="flex gap-1 overflow-x-auto border-b-hair">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`relative whitespace-nowrap px-4 py-2 t-body-sm font-medium transition-colors ${
              tab === t.id
                ? 'text-[var(--ember)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  tabProgress[t.id]
                    ? 'bg-[var(--ember)]'
                    : 'bg-[var(--text-muted)]'
                }`}
              />
              {t.label}
            </span>
            {tab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--ember)]" />
            )}
          </button>
        ))}
      </div>

      {tab === 'problem' && (
        <Card>
          <CardContent className="space-y-4 pt-4">
            {!isPractice && (
              <div className="space-y-2">
                <Label htmlFor="c-course">Course</Label>
                <select
                  id="c-course"
                  value={courseId ?? ''}
                  onChange={(e) => setCourseId(Number(e.target.value))}
                  className="flex h-8 w-full rounded-md border-hair bg-[var(--surface-raised)] px-3 t-body focus-ora"
                >
                  {myCourses.length === 0 && <option value="">No courses</option>}
                  {myCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
              <Label htmlFor="c-desc">Problem statement (Markdown)</Label>
              <textarea
                id="c-desc"
                rows={14}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex w-full rounded-md border-hair bg-[var(--surface-raised)] px-3 py-2 font-mono text-sm focus-ora"
                placeholder={`## Problem\n\nGiven an array and a target, return indices of two numbers summing to target.\n\n### Input format\nLine 1: n and target\nLine 2: n space-separated integers\n\n### Output format\nTwo 0-based indices i<j, space-separated\n\n### Constraints\n1 ≤ n ≤ 10^5`}
              />
              <p className="t-caption text-[var(--text-muted)]">
                Markdown supported. Describe input/output format, constraints, examples.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'tests' && (
        <Card>
          <CardContent className="space-y-4 pt-4">
            <p className="t-caption text-[var(--text-muted)]">
              Visible cases show sample I/O to students. Hidden cases stay secret. At least one visible case required.
            </p>
            {tests.map((t, i) => (
              <div key={i} className="space-y-2 rounded-md border-hair p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="t-caption font-semibold">
                    Test case {i + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateTest(i, { is_hidden: !t.is_hidden })
                      }
                      className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-sunken)] px-2 py-1 t-caption font-medium"
                    >
                      {t.is_hidden ? (
                        <>
                          <EyeOff size={12} /> Hidden
                        </>
                      ) : (
                        <>
                          <Eye size={12} /> Visible
                        </>
                      )}
                    </button>
                    <Badge tone={t.is_hidden ? 'warning' : 'success'}>
                      {t.is_hidden ? 'hidden' : 'visible'}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => removeTest(i)}
                      disabled={tests.length <= 1}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--danger-fg)] disabled:opacity-50"
                      aria-label="Delete test case"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Input (stdin)</Label>
                    <textarea
                      rows={4}
                      value={t.input}
                      onChange={(e) => updateTest(i, { input: e.target.value })}
                      className="flex w-full rounded-md border-hair bg-[var(--surface-raised)] px-2 py-1 font-mono text-xs focus-ora"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Expected output</Label>
                    <textarea
                      rows={4}
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
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => addTest(false)}
              >
                <Plus size={14} /> Visible case
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => addTest(true)}
              >
                <Plus size={14} /> Hidden case
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'languages' && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <p className="t-caption text-[var(--text-muted)]">
              Languages students can submit in. Pick at least one.
            </p>
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
          </CardContent>
        </Card>
      )}

      {tab === 'settings' && (
        <Card>
          <CardContent className="space-y-4 pt-4">
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
                  Countdown timer shown to student. Auto-submits at zero.
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
                  <Label htmlFor="c-att">Max attempts</Label>
                  <Input
                    id="c-att"
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
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-2 t-body">
                    <input
                      type="radio"
                      checked={scoring === 'all_or_nothing'}
                      onChange={() => setScoring('all_or_nothing')}
                    />
                    All-or-nothing
                  </label>
                  <label className="flex items-center gap-2 t-body">
                    <input
                      type="radio"
                      checked={scoring === 'partial'}
                      onChange={() => setScoring('partial')}
                    />
                    Partial credit (by weight)
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <p className="t-caption text-[var(--danger-fg)]">{error}</p>}
    </div>
  );
}
