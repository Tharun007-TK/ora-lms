'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { SubmissionBadge } from '@/components/submission-badge';
import { TestCaseViewer } from '@/components/testcase-viewer';
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
  judge,
  LANGUAGES,
  type JudgeProblem,
  type JudgeRunResult,
  type JudgeSubmission,
  type JudgeSubmitResult,
  type ProblemDifficulty,
} from '@/lib/api';

const DIFFICULTY_TONE: Record<ProblemDifficulty, 'success' | 'warning' | 'danger'> = {
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
};

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full rounded-md border bg-[var(--surface-sunken)]" />
  ),
});

const STARTER: Record<number, string> = {
  71: '# Python 3\nimport sys\n\ndef main():\n    data = sys.stdin.read()\n    print(data.strip())\n\nif __name__ == "__main__":\n    main()\n',
  54: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // read input and solve\n    return 0;\n}\n',
  62: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // read input and solve\n    }\n}\n',
  63: "const input = require('fs').readFileSync(0, 'utf8');\n// solve\nprocess.stdout.write('');\n",
};

export default function StudentProblemPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);

  const [problem, setProblem] = useState<JudgeProblem | null>(null);
  const [languageId, setLanguageId] = useState<number>(71);
  const [code, setCode] = useState<string>(STARTER[71]);
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<JudgeRunResult | null>(null);
  const [result, setResult] = useState<JudgeSubmitResult | null>(null);
  const [history, setHistory] = useState<JudgeSubmission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const monacoLang = useMemo(
    () => LANGUAGES.find((l) => l.id === languageId)?.monaco || 'python',
    [languageId],
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([judge.problem(id), judge.mySubmissions(id)])
      .then(([p, subs]) => {
        if (!cancelled) {
          setProblem(p);
          setHistory(subs);
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const onLanguageChange = (lid: number) => {
    setLanguageId(lid);
    if (!code || code === STARTER[languageId]) {
      setCode(STARTER[lid] ?? '');
    }
  };

  const onRun = async () => {
    if (!problem) return;
    setRunning(true);
    setError(null);
    setRunResult(null);
    try {
      const r = await judge.run(problem.id, {
        language_id: languageId,
        source_code: code,
      });
      setRunResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Run failed');
    } finally {
      setRunning(false);
    }
  };

  const onSubmit = async () => {
    if (!problem) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    setRunResult(null);
    try {
      const sub = await judge.submit(problem.id, {
        language_id: languageId,
        source_code: code,
      });
      setResult(sub);
      const updated = await judge.mySubmissions(problem.id);
      setHistory(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[var(--text-secondary)]">Loading…</p>;
  }
  if (error || !problem) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--danger-fg)]">{error || 'Problem not found.'}</p>
        <Link href="/student/judge" className="text-sm underline">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/student/judge"
          className="text-xs text-[var(--text-secondary)] hover:underline"
        >
          ← Back to problems
        </Link>
        <div className="flex items-center gap-3">
          <Badge tone={DIFFICULTY_TONE[problem.difficulty]}>
            {problem.difficulty}
          </Badge>
          <h1 className="text-2xl font-semibold">{problem.title}</h1>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
              {problem.description}
            </CardContent>
          </Card>
          {problem.examples && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Examples</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap rounded-md border bg-[var(--surface-sunken)] p-3 text-xs">
                  {problem.examples}
                </pre>
              </CardContent>
            </Card>
          )}
          {problem.constraints && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Constraints</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
                {problem.constraints}
              </CardContent>
            </Card>
          )}
          {problem.testcases.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sample testcases</CardTitle>
                <CardDescription>
                  Hidden testcases are only shown to admins.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {problem.testcases.map((tc, i) => (
                  <div key={tc.id} className="rounded-md border p-3 text-xs">
                    <p className="text-[var(--text-secondary)]">Case {i + 1}</p>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <div>
                        <p className="text-[10px] uppercase text-[var(--text-secondary)]">
                          Input
                        </p>
                        <pre className="whitespace-pre-wrap">{tc.input}</pre>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-[var(--text-secondary)]">
                          Expected
                        </p>
                        <pre className="whitespace-pre-wrap">
                          {tc.expected_output}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Editor</CardTitle>
              <select
                value={languageId}
                onChange={(e) => onLanguageChange(Number(e.target.value))}
                className="rounded-md border border-[var(--surface-border)] bg-[var(--surface-base)] px-2 py-1 text-sm"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border">
                <MonacoEditor
                  height="420px"
                  theme="vs-dark"
                  language={monacoLang}
                  value={code}
                  onChange={(v) => setCode(v ?? '')}
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                  }}
                />
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={onRun}
                  disabled={running || submitting || !code.trim()}
                  loading={running}
                >
                  {running ? 'Running…' : 'Run'}
                </Button>
                <Button
                  onClick={onSubmit}
                  disabled={submitting || running || !code.trim()}
                  loading={submitting}
                >
                  {submitting ? 'Judging…' : 'Submit'}
                </Button>
              </div>
              {error && <p className="mt-2 text-sm text-[var(--danger-fg)]">{error}</p>}
            </CardContent>
          </Card>

          {runResult && (
            <TestCaseViewer
              title="Test run (not submitted) — visible cases"
              status={runResult.status}
              passed={runResult.passed}
              total={runResult.total}
              timeMs={runResult.time_ms}
              memoryKb={runResult.memory_kb}
              stderr={runResult.stderr}
              testCases={runResult.test_cases}
            />
          )}

          {result && (
            <TestCaseViewer
              title={`Submission #${result.submission_id} · ${new Date(result.submitted_at).toLocaleString()}`}
              status={result.status}
              passed={result.passed}
              total={result.total}
              timeMs={result.time_ms}
              memoryKb={result.memory_kb}
              stderr={result.stderr}
              testCases={result.test_cases}
            />
          )}

          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">History</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {history.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div>
                        <SubmissionBadge verdict={s.status} />
                        <span className="ml-2 text-xs text-[var(--text-secondary)]">
                          {new Date(s.submitted_at).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {LANGUAGES.find((l) => l.id === s.language_id)?.name ||
                          s.language_id}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
