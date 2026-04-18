'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AssignmentCard } from '@/components/assignment-card';
import { assignments, fileUrl, type Assignment, type Submission } from '@/lib/api';

export default function StudentAssignmentsPage() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);
  const [items, setItems] = useState<Assignment[]>([]);
  const [mine, setMine] = useState<Record<number, Submission>>({});
  const [activeUpload, setActiveUpload] = useState<number | null>(null);
  const [progress, setProgress] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [list, submissions] = await Promise.all([
        assignments.list(courseId),
        assignments.mySubmissions(),
      ]);
      setItems(list);
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

      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No assignments published yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((a) => {
            const submission = mine[a.id];
            const file = fileUrl(submission?.file_url);
            const pct = progress[a.id] ?? 0;
            const uploading = activeUpload === a.id;

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
