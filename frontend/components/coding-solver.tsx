'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';

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

  const load = async () => {
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
  };

  useEffect(() => {
    if (Number.isFinite(assessmentId)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

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

  const submit = async () => {
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
      });
      setLatest(sub);
      setRunResult(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

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
    (assessment.is_practice ||
      (attemptsLeft != null && attemptsLeft > 0));

  return (
    <div className="space-y-4">
      <Link
        href={backHref}
        className="text-xs text-[var(--text-secondary)] hover:underline"
      >
        ← Back
      </Link>

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
                    disabled={running || submitting}
                    loading={running}
                  >
                    {running ? 'Running…' : 'Run'}
                  </Button>
                  <Button
                    onClick={submit}
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
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
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
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
