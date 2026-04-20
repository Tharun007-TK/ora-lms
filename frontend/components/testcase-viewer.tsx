'use client';

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Cpu,
  Eye,
  EyeOff,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ora';
import type { JudgeTestCaseResult, JudgeVerdict } from '@/lib/api';

interface Props {
  title: string;
  status: JudgeVerdict;
  passed: number;
  total: number;
  timeMs: number | null;
  memoryKb: number | null;
  stderr: string | null;
  testCases: JudgeTestCaseResult[];
}

function verdictTone(v: JudgeVerdict): 'success' | 'warning' | 'danger' | 'info' {
  switch (v) {
    case 'AC':
      return 'success';
    case 'TLE':
      return 'warning';
    case 'CE':
      return 'info';
    case 'WA':
    case 'RE':
    default:
      return 'danger';
  }
}

function verdictFull(v: JudgeVerdict): string {
  switch (v) {
    case 'AC':
      return 'Accepted';
    case 'WA':
      return 'Wrong Answer';
    case 'TLE':
      return 'Time Limit Exceeded';
    case 'RE':
      return 'Runtime Error';
    case 'CE':
      return 'Compilation Error';
    default:
      return String(v);
  }
}

function DiffLine({
  expected,
  actual,
}: {
  expected: string;
  actual: string;
}) {
  const expLines = expected.split('\n');
  const actLines = actual.split('\n');
  const rows = Math.max(expLines.length, actLines.length);
  return (
    <div className="overflow-hidden rounded-md border-hair font-mono text-xs">
      <div className="grid grid-cols-[auto,1fr,1fr] bg-[var(--surface-sunken)] px-2 py-1 t-caption text-[var(--text-muted)]">
        <span className="pr-3">#</span>
        <span className="pr-3">Expected</span>
        <span>Your output</span>
      </div>
      {Array.from({ length: rows }).map((_, i) => {
        const e = expLines[i] ?? '';
        const a = actLines[i] ?? '';
        const match = e === a;
        return (
          <div
            key={i}
            className={`grid grid-cols-[auto,1fr,1fr] gap-0 border-t-hair px-2 py-0.5 ${
              match ? '' : 'bg-[var(--danger-bg)]/40'
            }`}
          >
            <span className="pr-3 text-[var(--text-muted)]">{i + 1}</span>
            <span className="whitespace-pre-wrap pr-3">{e || ' '}</span>
            <span
              className={`whitespace-pre-wrap ${
                match ? '' : 'text-[var(--danger-fg)]'
              }`}
            >
              {a || ' '}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function TestCaseViewer({
  title,
  status,
  passed,
  total,
  timeMs,
  memoryKb,
  stderr,
  testCases,
}: Props) {
  const [active, setActive] = useState(0);
  const current = testCases[active];

  const compileError = status === 'CE';
  const hasRuntimeError = useMemo(
    () => testCases.some((tc) => tc.stderr && tc.stderr.trim() !== ''),
    [testCases],
  );

  return (
    <div className="rounded-lg border-hair bg-[var(--surface-raised)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-hair px-4 py-3">
        <div className="flex items-center gap-2">
          {status === 'AC' ? (
            <CheckCircle2 size={18} className="text-[var(--success-fg)]" />
          ) : status === 'CE' ? (
            <AlertCircle size={18} className="text-[var(--info-fg)]" />
          ) : (
            <XCircle size={18} className="text-[var(--danger-fg)]" />
          )}
          <div>
            <p className="t-caption text-[var(--text-muted)]">{title}</p>
            <p className="t-body font-semibold">
              {verdictFull(status)} · {passed}/{total} passed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 t-caption text-[var(--text-secondary)]">
          {timeMs != null && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> {timeMs} ms
            </span>
          )}
          {memoryKb != null && (
            <span className="inline-flex items-center gap-1">
              <Cpu size={12} /> {memoryKb} KB
            </span>
          )}
          <Badge tone={verdictTone(status)}>{status}</Badge>
        </div>
      </div>

      {compileError && stderr ? (
        <div className="p-4">
          <p className="mb-2 t-caption font-semibold uppercase tracking-wide text-[var(--info-fg)]">
            Compiler output
          </p>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border-hair bg-[var(--info-bg)] p-3 font-mono text-xs text-[var(--info-fg)]">
            {stderr}
          </pre>
        </div>
      ) : testCases.length === 0 ? (
        <div className="p-4 t-body text-[var(--text-muted)]">
          No test case data.
        </div>
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto border-b-hair px-2 py-1">
            {testCases.map((tc, i) => {
              const on = i === active;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-t-md px-3 py-1.5 t-caption font-medium transition-colors ${
                    on
                      ? 'bg-[var(--surface-sunken)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tc.passed ? (
                    <CheckCircle2 size={12} className="text-[var(--success-fg)]" />
                  ) : (
                    <XCircle size={12} className="text-[var(--danger-fg)]" />
                  )}
                  {tc.is_hidden ? (
                    <>
                      <EyeOff size={11} /> Hidden #{tc.index + 1}
                    </>
                  ) : (
                    <>
                      <Eye size={11} /> Case #{tc.index + 1}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {current && (
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <p className="t-caption font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  {current.is_hidden
                    ? `Hidden test case #${current.index + 1}`
                    : `Test case #${current.index + 1}`}
                </p>
                <div className="flex items-center gap-2 t-caption">
                  {current.time_ms != null && (
                    <span className="text-[var(--text-muted)]">
                      {current.time_ms} ms
                    </span>
                  )}
                  <Badge tone={current.passed ? 'success' : 'danger'}>
                    {current.passed ? 'Passed' : 'Failed'}
                  </Badge>
                </div>
              </div>

              {current.is_hidden && current.stderr == null ? (
                <p className="rounded-md border-hair bg-[var(--surface-sunken)] p-3 t-body text-[var(--text-muted)]">
                  Input and output hidden.{' '}
                  {current.passed
                    ? 'Your code passed this case.'
                    : 'Your code failed this case.'}
                </p>
              ) : current.stderr ? (
                <div>
                  <p className="mb-1 t-caption font-semibold uppercase tracking-wide text-[var(--danger-fg)]">
                    Runtime error
                  </p>
                  <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-md border-hair bg-[var(--danger-bg)] p-3 font-mono text-xs text-[var(--danger-fg)]">
                    {current.stderr}
                  </pre>
                </div>
              ) : (
                <>
                  {current.stdin != null && (
                    <div>
                      <p className="mb-1 t-caption font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                        Input (stdin)
                      </p>
                      <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border-hair bg-[var(--surface-sunken)] p-2 font-mono text-xs">
                        {current.stdin}
                      </pre>
                    </div>
                  )}
                  {current.expected_output != null &&
                    current.actual_output != null && (
                      <div>
                        <p className="mb-1 t-caption font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                          Expected vs Your output
                        </p>
                        <DiffLine
                          expected={current.expected_output}
                          actual={current.actual_output}
                        />
                      </div>
                    )}
                  {current.expected_output != null &&
                    current.actual_output == null && (
                      <div>
                        <p className="mb-1 t-caption font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                          Expected output
                        </p>
                        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border-hair bg-[var(--surface-sunken)] p-2 font-mono text-xs">
                          {current.expected_output}
                        </pre>
                      </div>
                    )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {!compileError && hasRuntimeError && (
        <details className="border-t-hair">
          <summary className="cursor-pointer px-4 py-2 t-caption font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Console (first stderr)
          </summary>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap bg-[var(--danger-bg)]/40 px-4 py-2 font-mono text-xs text-[var(--danger-fg)]">
            {testCases.find((tc) => tc.stderr)?.stderr || ''}
          </pre>
        </details>
      )}
    </div>
  );
}
