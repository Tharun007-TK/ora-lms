'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ora';
import {
  coding,
  codingLanguageLabel,
  codingLanguageMonaco,
  type CodingAssessment,
  type CodingLanguage,
  type CodingRunResult,
  type CodingSubmission,
} from '@/lib/api';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full rounded-md border-hair bg-[var(--surface-sunken)]" />
  ),
});

const DEFAULT_STARTER: Record<CodingLanguage, string> = {
  python: '# Read stdin, print output.\n',
  c: '#include <stdio.h>\n\nint main(void) {\n    return 0;\n}\n',
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n',
  java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n    }\n}\n',
  javascript: '// Read stdin via process.stdin, log output.\n',
};

const MAX_TAB_SWITCHES = 3;

function formatClock(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function CodingSolver({
  assessmentId,
  backHref,
}: {
  assessmentId: number;
  backHref: string;
}) {
  const [assessment, setAssessment] = useState<CodingAssessment | null>(null);
  const [language, setLanguage] = useState<CodingLanguage>('python');
  const [source, setSource] = useState<string>('');
  const [submissions, setSubmissions] = useState<CodingSubmission[]>([]);
  const [latest, setLatest] = useState<CodingSubmission | null>(null);
  const [runResult, setRunResult] = useState<CodingRunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [examStarted, setExamStarted] = useState(false);
  const [examEnded, setExamEnded] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const tabSwitchesRef = useRef(0);
  const examStartedRef = useRef(false);
  const examEndedRef = useRef(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    tabSwitchesRef.current = tabSwitches;
  }, [tabSwitches]);
  useEffect(() => {
    examStartedRef.current = examStarted;
  }, [examStarted]);
  useEffect(() => {
    examEndedRef.current = examEnded;
  }, [examEnded]);
  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  const isExamMode = !!assessment && !assessment.is_practice;

  const load = useCallback(async () => {
    try {
      const [a, subs] = await Promise.all([
        coding.get(assessmentId),
        coding.mySubmissions(assessmentId),
      ]);
      setAssessment(a);
      const lang = a.allowed_languages[0] ?? 'python';
      setLanguage(lang);
      setSource(DEFAULT_STARTER[lang]);
      setSubmissions(subs);
      if (subs[0]) setLatest(subs[0]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    if (Number.isFinite(assessmentId)) load();
  }, [assessmentId, load]);

  const exitFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
  }, []);

  const submitInternal = useCallback(
    async (opts: { auto: boolean; reason?: string }) => {
      if (!assessment) return;
      if (submittingRef.current) return;
      if (examEndedRef.current) return;
      setError(null);
      if (!source.trim()) {
        setError('Source code is empty.');
        return;
      }
      setSubmitting(true);
      try {
        const sub = await coding.submit(assessmentId, {
          language,
          source_code: source,
          tab_switches: tabSwitchesRef.current,
          auto_submitted: opts.auto,
        });
        setLatest(sub);
        setRunResult(null);
        // Practice stays open for repeat attempts; graded ends after submit.
        if (!assessment.is_practice) {
          setExamEnded(true);
          examEndedRef.current = true;
          exitFullscreen();
        }
        if (opts.reason) setWarning(opts.reason);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Submission failed');
      } finally {
        setSubmitting(false);
      }
    },
    [assessment, assessmentId, language, source, exitFullscreen, load],
  );

  useEffect(() => {
    if (!isExamMode) return;
    if (!examStarted || examEnded || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      void submitInternal({ auto: true, reason: 'Time up — auto-submitted.' });
      return;
    }
    const t = window.setTimeout(() => {
      setSecondsLeft((v) => (v === null ? null : v - 1));
    }, 1000);
    return () => window.clearTimeout(t);
  }, [isExamMode, examStarted, examEnded, secondsLeft, submitInternal]);

  useEffect(() => {
    if (!isExamMode) return;
    if (!examStarted || examEnded) return;

    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') return;
      const next = tabSwitchesRef.current + 1;
      tabSwitchesRef.current = next;
      setTabSwitches(next);
      if (next >= MAX_TAB_SWITCHES) {
        void submitInternal({
          auto: true,
          reason: `Tab switched ${next} times — auto-submitted.`,
        });
      } else {
        setWarning(
          `Warning ${next}/${MAX_TAB_SWITCHES}: leaving the tab is not allowed. Test auto-submits after ${MAX_TAB_SWITCHES} switches.`,
        );
      }
    };

    const onFullscreenChange = () => {
      if (examEndedRef.current) return;
      if (!document.fullscreenElement) {
        setWarning(
          'Fullscreen exited. Re-enter fullscreen to continue. Repeated exits count as tab switches.',
        );
        const next = tabSwitchesRef.current + 1;
        tabSwitchesRef.current = next;
        setTabSwitches(next);
        if (next >= MAX_TAB_SWITCHES) {
          void submitInternal({
            auto: true,
            reason: `Fullscreen exited ${next} times — auto-submitted.`,
          });
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [examStarted, examEnded, submitInternal]);

  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  const requestFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) return;
    try {
      await containerRef.current.requestFullscreen();
    } catch {
      // fullscreen refused or unsupported — proceed without it.
    }
  }, []);

  const startExam = useCallback(async () => {
    if (!assessment) return;
    await requestFullscreen();
    if (!assessment.is_practice) {
      const mins = assessment.duration_minutes ?? 60;
      setSecondsLeft(mins * 60);
      setTabSwitches(0);
      tabSwitchesRef.current = 0;
    }
    setWarning(null);
    setExamStarted(true);
    examStartedRef.current = true;
  }, [assessment, requestFullscreen]);

  const runOnly = async () => {
    setError(null);
    if (!source.trim()) {
      setError('Source code is empty.');
      return;
    }
    setRunning(true);
    try {
      const r = await coding.run(assessmentId, {
        language,
        source_code: source,
      });
      setRunResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Run failed');
    } finally {
      setRunning(false);
    }
  };

  const submitManual = () => submitInternal({ auto: false });

  const onLanguageChange = (l: CodingLanguage) => {
    setLanguage(l);
    if (!source.trim() || Object.values(DEFAULT_STARTER).includes(source.trim())) {
      setSource(DEFAULT_STARTER[l]);
    }
  };

  if (loading)
    return <p className="t-body text-[var(--text-secondary)]">Loading…</p>;
  if (!assessment)
    return (
      <p className="t-body text-[var(--danger-fg)]">
        {error || 'Could not load assessment.'}
      </p>
    );

  const attemptsUsed = submissions.length;
  const attemptsLeft = assessment.is_practice
    ? null
    : Math.max(0, assessment.max_attempts - attemptsUsed);
  const canSubmit =
    !submitting &&
    !examEnded &&
    (assessment.is_practice ||
      (attemptsLeft != null && attemptsLeft > 0));

  if (!examStarted && !examEnded) {
    const duration = assessment.duration_minutes ?? 60;
    const noAttempts = attemptsLeft != null && attemptsLeft <= 0;
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          href={backHref}
          className="text-xs text-[var(--text-secondary)] hover:underline"
        >
          ← Back
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>{assessment.title}</CardTitle>
            <CardDescription>
              {assessment.is_practice
                ? `Practice · unlimited attempts${
                    assessment.points ? ` · ${assessment.points} pts` : ''
                  }`
                : `${attemptsLeft} / ${assessment.max_attempts} attempts left`}
              {assessment.due_date &&
                ` · due ${new Date(assessment.due_date).toLocaleString()}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc space-y-1 pl-5 t-body text-[var(--text-primary)]">
              <li>Opens in fullscreen for a distraction-free editor.</li>
              {isExamMode ? (
                <>
                  <li>Exit counts against you.</li>
                  <li>
                    Duration: <strong>{duration} minutes</strong>. Timer
                    auto-submits at zero.
                  </li>
                  <li>
                    Tab / window switches are counted. After{' '}
                    <strong>{MAX_TAB_SWITCHES} switches</strong> the test
                    auto-submits.
                  </li>
                  <li>
                    Score = testcases passed / total testcases × max score.
                  </li>
                  <li>
                    Submission shows passed count, time taken, memory used.
                  </li>
                </>
              ) : (
                <>
                  <li>No timer. Unlimited attempts.</li>
                  <li>Exit fullscreen any time with Esc.</li>
                  <li>Submission shows passed count, time taken, memory used.</li>
                </>
              )}
            </ul>
            {noAttempts && (
              <p className="t-caption text-[var(--danger-fg)]">
                No attempts remaining.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Link href={backHref}>
                <Button variant="secondary">Cancel</Button>
              </Link>
              <Button onClick={startExam} disabled={noAttempts}>
                {isExamMode ? 'Start exam' : 'Start coding'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {latest && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Previous submission</CardTitle>
                <Badge
                  tone={
                    latest.score === assessment.max_score
                      ? 'success'
                      : latest.score > 0
                      ? 'warning'
                      : 'danger'
                  }
                >
                  {latest.score} / {assessment.max_score}
                </Badge>
              </div>
              <CardDescription>
                {new Date(latest.submitted_at).toLocaleString()} ·{' '}
                {latest.status}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SubmissionStats submission={latest} />
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="space-y-4 bg-[var(--surface-base)]"
      style={
        examStarted && !examEnded
          ? { minHeight: '100vh', padding: '1rem' }
          : undefined
      }
    >
      {isExamMode && examStarted && !examEnded && (
        <div className="sticky top-0 z-20 -mx-4 -mt-4 flex flex-wrap items-center justify-between gap-2 border-b-hair bg-[var(--surface-raised)] px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-semibold text-[var(--ember)]">
              ⏱ {secondsLeft !== null ? formatClock(secondsLeft) : '--:--'}
            </span>
            <Badge
              tone={
                tabSwitches >= MAX_TAB_SWITCHES - 1
                  ? 'danger'
                  : tabSwitches > 0
                  ? 'warning'
                  : 'success'
              }
            >
              Tab switches {tabSwitches} / {MAX_TAB_SWITCHES}
            </Badge>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={submitManual}
            disabled={!canSubmit}
            loading={submitting}
          >
            End & submit
          </Button>
        </div>
      )}

      {!examStarted && (
        <Link
          href={backHref}
          className="text-xs text-[var(--text-secondary)] hover:underline"
        >
          ← Back
        </Link>
      )}

      {warning && (
        <div className="rounded-md border-hair bg-[var(--warning-bg)] px-3 py-2 t-caption text-[var(--warning-fg)]">
          {warning}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="lg:max-h-[calc(100vh-8rem)] lg:overflow-auto">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="flex-1 min-w-0 break-words">
                {assessment.title}
              </CardTitle>
              {assessment.is_practice && assessment.difficulty && (
                <Badge
                  tone={
                    assessment.difficulty === 'easy'
                      ? 'success'
                      : assessment.difficulty === 'medium'
                      ? 'warning'
                      : 'danger'
                  }
                >
                  {assessment.difficulty}
                </Badge>
              )}
              {assessment.is_practice && (
                <Badge tone="ember">{assessment.points} pts</Badge>
              )}
            </div>
            <CardDescription>
              {assessment.is_practice
                ? 'Practice · unlimited attempts'
                : `${attemptsLeft} / ${assessment.max_attempts} attempts left`}
              {assessment.due_date &&
                ` · due ${new Date(assessment.due_date).toLocaleString()}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="whitespace-pre-wrap t-body text-[var(--text-primary)]">
              {assessment.description}
            </div>
            {assessment.test_cases_student &&
              assessment.test_cases_student.some((tc) => !tc.is_hidden) && (
                <div className="space-y-2">
                  <h3 className="t-caption font-semibold uppercase tracking-wide text-[var(--ember)]">
                    Sample test cases
                  </h3>
                  {assessment.test_cases_student
                    .filter((tc) => !tc.is_hidden)
                    .map((tc, i) => (
                      <div
                        key={tc.id}
                        className="rounded-md border-hair bg-[var(--surface-sunken)] p-2"
                      >
                        <p className="t-caption text-[var(--text-muted)]">
                          Test {i + 1}
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <pre className="whitespace-pre-wrap rounded bg-[var(--surface-raised)] p-2 font-mono text-xs">
                            stdin{'\n'}
                            {tc.input ?? ''}
                          </pre>
                          <pre className="whitespace-pre-wrap rounded bg-[var(--surface-raised)] p-2 font-mono text-xs">
                            expected{'\n'}
                            {tc.expected_output ?? ''}
                          </pre>
                        </div>
                      </div>
                    ))}
                </div>
              )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="t-caption text-[var(--text-secondary)]">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) =>
                      onLanguageChange(e.target.value as CodingLanguage)
                    }
                    disabled={examEnded}
                    className="rounded-md border-hair bg-[var(--surface-raised)] px-2 py-1 t-body focus-ora"
                  >
                    {assessment.allowed_languages.map((l) => (
                      <option key={l} value={l}>
                        {codingLanguageLabel(l)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={runOnly}
                    disabled={running || submitting || examEnded}
                    loading={running}
                  >
                    {running ? 'Running…' : 'Run'}
                  </Button>
                  <Button
                    onClick={submitManual}
                    disabled={!canSubmit}
                    loading={submitting}
                  >
                    {submitting ? 'Submitting…' : 'Submit'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[400px] min-h-[300px] w-full">
                <MonacoEditor
                  height="100%"
                  language={codingLanguageMonaco(language)}
                  value={source}
                  theme="vs-dark"
                  onChange={(v) => setSource(v ?? '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    readOnly: examEnded,
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {error && (
            <p className="t-caption text-[var(--danger-fg)]">{error}</p>
          )}

          {runResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Test run (not submitted)</CardTitle>
                  <Badge
                    tone={
                      runResult.passed === runResult.total
                        ? 'success'
                        : runResult.passed > 0
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {runResult.passed} / {runResult.total} visible
                  </Badge>
                </div>
                <CardDescription>
                  Run against visible test cases only. Click Submit to grade.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {runResult.test_case_results.map((r, i) => (
                  <div
                    key={r.test_case_id}
                    className="flex items-start gap-2 rounded-md border-hair p-2"
                  >
                    <Badge tone={r.passed ? 'success' : 'danger'}>
                      {r.passed ? 'Pass' : 'Fail'}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="t-caption font-semibold">Test {i + 1}</p>
                      {r.time_ms != null && (
                        <p className="t-caption text-[var(--text-muted)]">
                          {r.time_ms} ms
                        </p>
                      )}
                      {r.stderr && (
                        <pre className="mt-1 whitespace-pre-wrap rounded bg-[var(--danger-bg)] p-1 font-mono text-xs text-[var(--danger-fg)]">
                          {r.stderr}
                        </pre>
                      )}
                      {r.stdout && (
                        <pre className="mt-1 whitespace-pre-wrap rounded bg-[var(--surface-sunken)] p-1 font-mono text-xs">
                          {r.stdout}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {latest && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Latest submission</CardTitle>
                  <Badge
                    tone={
                      latest.score === assessment.max_score
                        ? 'success'
                        : latest.score > 0
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {latest.score} / {assessment.max_score}
                  </Badge>
                </div>
                <CardDescription>
                  {new Date(latest.submitted_at).toLocaleString()} ·{' '}
                  {latest.status}
                  {latest.auto_submitted ? ' · auto-submitted' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <SubmissionStats submission={latest} />
                {assessment.is_practice && latest.earned_stars_now != null && (
                  <div className="rounded-md border-hair bg-[var(--surface-sunken)] p-3">
                    <p className="t-caption text-[var(--text-muted)]">
                      Stars earned this submit
                    </p>
                    <p className="text-2xl font-semibold text-[var(--warning-fg)]">
                      {'★'.repeat(latest.earned_stars_now)}
                      <span className="text-[var(--text-muted)]">
                        {'☆'.repeat(3 - latest.earned_stars_now)}
                      </span>
                    </p>
                    {latest.total_stars != null && (
                      <p className="t-caption text-[var(--text-secondary)]">
                        Total stars: {latest.total_stars}
                      </p>
                    )}
                  </div>
                )}
                {latest.new_badges && latest.new_badges.length > 0 && (
                  <div className="space-y-2 rounded-md border-hair bg-[var(--surface-sunken)] p-3">
                    <p className="t-caption text-[var(--text-muted)]">
                      New badges unlocked
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {latest.new_badges.map((b) => (
                        <div
                          key={b.key}
                          title={b.description}
                          className="flex items-center gap-2 rounded-full border-hair bg-[var(--surface-raised)] px-3 py-1"
                        >
                          <span className="text-lg">{b.icon}</span>
                          <span className="t-caption font-semibold">
                            {b.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {latest.test_case_results?.map((r, i) => (
                  <div
                    key={r.test_case_id}
                    className="flex items-start gap-2 rounded-md border-hair p-2"
                  >
                    <Badge tone={r.passed ? 'success' : 'danger'}>
                      {r.passed ? 'Pass' : 'Fail'}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="t-caption font-semibold">
                        {r.is_hidden
                          ? `Hidden test case ${i + 1}`
                          : `Test case ${i + 1}`}
                      </p>
                      {r.time_ms != null && (
                        <p className="t-caption text-[var(--text-muted)]">
                          {r.time_ms} ms
                          {r.memory_kb != null
                            ? ` · ${r.memory_kb} kb`
                            : ''}
                        </p>
                      )}
                      {!r.is_hidden && r.stderr && (
                        <pre className="mt-1 whitespace-pre-wrap rounded bg-[var(--danger-bg)] p-1 font-mono text-xs text-[var(--danger-fg)]">
                          {r.stderr}
                        </pre>
                      )}
                      {!r.is_hidden && r.stdout && (
                        <pre className="mt-1 whitespace-pre-wrap rounded bg-[var(--surface-sunken)] p-1 font-mono text-xs">
                          {r.stdout}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
                {examEnded && (
                  <div className="flex justify-end">
                    <Link href={backHref}>
                      <Button variant="secondary">Back to assignments</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function SubmissionStats({ submission }: { submission: CodingSubmission }) {
  const passed =
    submission.passed_count ??
    submission.test_case_results?.filter((r) => r.passed).length ??
    null;
  const total =
    submission.total_count ?? submission.test_case_results?.length ?? null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat
        label="Testcases"
        value={
          passed != null && total != null ? `${passed} / ${total}` : '—'
        }
      />
      <Stat
        label="Time"
        value={submission.time_ms != null ? `${submission.time_ms} ms` : '—'}
      />
      <Stat
        label="Memory"
        value={
          submission.memory_kb != null ? `${submission.memory_kb} kb` : '—'
        }
      />
      <Stat label="Tab switches" value={String(submission.tab_switches ?? 0)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border-hair bg-[var(--surface-sunken)] p-2">
      <p className="t-caption text-[var(--text-muted)]">{label}</p>
      <p className="t-body font-semibold">{value}</p>
    </div>
  );
}
