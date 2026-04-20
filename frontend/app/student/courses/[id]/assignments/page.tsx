'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AssignmentCard } from '@/components/assignment-card';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ora';
import {
  assignments,
  coding,
  fileUrl,
  type Assignment,
  type CodingAssessmentBrief,
  type Submission,
} from '@/lib/api';

export default function StudentAssignmentsPage() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);
  const [items, setItems] = useState<Assignment[]>([]);
  const [codingItems, setCodingItems] = useState<CodingAssessmentBrief[]>([]);
  const [mine, setMine] = useState<Record<number, Submission>>({});
  const [activeUpload, setActiveUpload] = useState<number | null>(null);
  const [progress, setProgress] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [list, submissions, code] = await Promise.all([
        assignments.list(courseId),
        assignments.mySubmissions(),
        coding
          .listForCourse(courseId)
          .catch(() => [] as CodingAssessmentBrief[]),
      ]);
      setItems(list);
      setCodingItems(code);
      const byId: Record<number, Submission> = {};
      for (const s of submissions) byId[s.assignment_id] = s;
      setMine(byId);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Number.isFinite(courseId)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleFile = async (assignmentId: number, file: File) => {
    setActiveUpload(assignmentId);
    setProgress((p) => ({ ...p, [assignmentId]: 0 }));
    try {
      const fd = new FormData();
      fd.set('file', file);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${apiUrl}/assignments/${assignmentId}/submit`);
        xhr.withCredentials = true;
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setProgress((p) => ({
              ...p,
              [assignmentId]: Math.round((ev.loaded / ev.total) * 100),
            }));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else {
            try {
              const body = JSON.parse(xhr.responseText);
              reject(new Error(body?.detail || xhr.statusText));
            } catch {
              reject(new Error(xhr.statusText || 'Upload failed'));
            }
          }
        };
        xhr.send(fd);
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setActiveUpload(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={`/student/courses/${courseId}`}
          className="text-xs text-[var(--text-secondary)] hover:underline"
        >
          ← Back to course
        </Link>
        <h1 className="text-2xl font-semibold">Assignments</h1>
      </header>

      {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}

      {codingItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="t-caption font-semibold uppercase tracking-wide text-[var(--ember)]">
            Coding assessments
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {codingItems.map((c) => (
              <Link
                key={c.id}
                href={`/student/courses/${courseId}/assignments/${c.id}/code`}
                className="focus-ora rounded-lg"
              >
                <Card className="h-full transition-colors hover:border-[var(--ember)]">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{c.title}</CardTitle>
                      <Badge tone="ember">Code</Badge>
                    </div>
                    <CardDescription>
                      {c.allowed_languages.length} language
                      {c.allowed_languages.length === 1 ? '' : 's'}
                      {c.due_date &&
                        ` · due ${new Date(c.due_date).toLocaleDateString()}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <span className="t-caption text-[var(--text-secondary)]">
                      {c.attempts_used ?? 0} / {c.max_attempts} attempts
                    </span>
                    {c.best_score != null && (
                      <Badge
                        tone={
                          c.best_score === c.max_score ? 'success' : 'warning'
                        }
                      >
                        Best {c.best_score}/{c.max_score}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      ) : items.length === 0 && codingItems.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No assignments published yet.</p>
      ) : items.length === 0 ? null : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((a) => {
            const submission = mine[a.id];
            const file = fileUrl(submission?.file_url);
            const pct = progress[a.id] ?? 0;
            const uploading = activeUpload === a.id;

            if (a.type === 'quiz') {
              return (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  footer={
                    <Link
                      href={`/student/courses/${courseId}/assignments/${a.id}/attempt`}
                      className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--ember)] px-3 text-sm font-medium text-[var(--ember-ink)] hover:opacity-90"
                    >
                      {a.submitted
                        ? 'Review result'
                        : a.attempt_id != null
                        ? 'Resume quiz'
                        : 'Take quiz'}
                    </Link>
                  }
                />
              );
            }

            return (
              <AssignmentCard
                key={a.id}
                assignment={{
                  ...a,
                  submitted: !!submission,
                  marks: submission?.marks ?? null,
                }}
                footer={
                  <div className="flex w-full flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <label
                        className={`inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-3 text-sm font-medium ${
                          submission
                            ? 'bg-[var(--surface-sunken)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]/80'
                            : 'bg-[var(--ember)] text-[var(--ember-ink)] hover:bg-[var(--ember)]/90'
                        } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
                      >
                        {submission ? 'Resubmit' : 'Submit'}
                        <input
                          type="file"
                          className="hidden"
                          disabled={uploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFile(a.id, f);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {file && (
                        <a
                          href={file}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[var(--ember)] hover:underline"
                        >
                          Open submission ↗
                        </a>
                      )}
                    </div>
                    {uploading && (
                      <div className="h-1 w-full overflow-hidden rounded bg-[var(--surface-sunken)]">
                        <div
                          className="h-full bg-[var(--ember)] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                    {submission?.feedback && (
                      <p className="text-xs text-[var(--text-secondary)]">
                        Feedback: {submission.feedback}
                      </p>
                    )}
                  </div>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
