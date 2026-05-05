'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ora';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ora';
import { Input } from '@/components/ora';
import { Label } from '@/components/ora';
import {
  assignments,
  downloadFile,
  fileUrl,
  type Assignment,
  type Submission,
} from '@/lib/api';

export default function FacultySubmissionsPage() {
  const params = useParams<{ id: string; aid: string }>();
  const courseId = Number(params.id);
  const aid = Number(params.aid);

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [items, setItems] = useState<Submission[]>([]);
  const [drafts, setDrafts] = useState<
    Record<number, { marks: string; feedback: string }>
  >({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    setError(null);
    try {
      await downloadFile(
        assignments.exportSubmissionsCsvUrl(aid),
        `submissions_${aid}.csv`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const load = async () => {
    try {
      const [a, list] = await Promise.all([
        assignments.get(aid),
        assignments.submissions(aid),
      ]);
      setAssignment(a);
      setItems(list);
      setDrafts((prev) => {
        const next = { ...prev };
        for (const s of list) {
          if (!(s.id in next)) {
            next[s.id] = {
              marks: s.marks != null ? String(s.marks) : '',
              feedback: s.feedback ?? '',
            };
          }
        }
        return next;
      });
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

  const grade = async (submissionId: number) => {
    const draft = drafts[submissionId];
    if (!draft) return;
    const marks = Number(draft.marks);
    if (!Number.isFinite(marks) || marks < 0) {
      setError('Marks must be a non-negative number');
      return;
    }
    setSavingId(submissionId);
    setError(null);
    try {
      await assignments.grade(submissionId, {
        marks,
        feedback: draft.feedback || null,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grading failed');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/faculty/assessments"
          className="text-xs text-[var(--text-secondary)] hover:underline"
        >
          ← Back to assessments
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">
              Submissions{assignment ? ` · ${assignment.title}` : ''}
            </h1>
            {assignment && (
              <p className="text-sm text-[var(--text-secondary)]">
                Due {new Date(assignment.due_date).toLocaleString()} · max{' '}
                {assignment.max_marks} marks
              </p>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={exportCsv}
            disabled={exporting || loading}
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>
      </header>

      {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}

      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No submissions yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((s) => {
            const url = fileUrl(s.file_url);
            const draft = drafts[s.id] ?? { marks: '', feedback: '' };
            return (
              <Card key={s.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {s.student_name || `Student #${s.student_id}`}
                  </CardTitle>
                  <CardDescription>
                    Submitted {new Date(s.submitted_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-[var(--ember)] hover:underline"
                    >
                      Open submission ↗
                    </a>
                  )}
                  <div className="grid gap-2 sm:grid-cols-3 sm:items-end">
                    <div className="space-y-1">
                      <Label htmlFor={`marks-${s.id}`}>Marks</Label>
                      <Input
                        id={`marks-${s.id}`}
                        type="number"
                        min={0}
                        max={assignment?.max_marks ?? 1000}
                        value={draft.marks}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [s.id]: {
                              ...prev[s.id],
                              marks: e.target.value,
                              feedback: prev[s.id]?.feedback ?? '',
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor={`fb-${s.id}`}>Feedback</Label>
                      <Input
                        id={`fb-${s.id}`}
                        value={draft.feedback}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [s.id]: {
                              ...prev[s.id],
                              marks: prev[s.id]?.marks ?? '',
                              feedback: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                  {s.graded_at && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      Last graded {new Date(s.graded_at).toLocaleString()}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="justify-end">
                  <Button
                    size="sm"
                    onClick={() => grade(s.id)}
                    disabled={savingId === s.id || draft.marks === ''}
                  >
                    {savingId === s.id ? 'Saving…' : 'Save grade'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
