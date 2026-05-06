'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/components/ora';
import { assignments, courses, type Course } from '@/lib/api';

export default function NewQuizAssessmentPage() {
  const router = useRouter();

  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [due, setDue] = useState('');
  const [maxMarks, setMaxMarks] = useState(10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

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

  const submit = async () => {
    setError(null);
    if (courseId == null) return setError('Pick a course.');
    if (!title.trim()) return setError('Title required.');
    if (!due) return setError('Due date required.');
    setSaving(true);
    try {
      const created = await assignments.create(courseId, {
        title,
        description: description || null,
        due_date: new Date(due).toISOString(),
        max_marks: maxMarks,
        type: 'quiz',
      });
      router.replace(
        `/faculty/courses/${courseId}/assignments/${created.id}/edit`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const importFromDocx = async () => {
    setImportError(null);
    if (courseId == null) return setImportError('Pick a course.');
    if (!docxFile) return setImportError('Choose a .docx file.');
    if (!due) return setImportError('Due date required.');
    setImporting(true);
    try {
      const created = await assignments.importQuiz(courseId, {
        file: docxFile,
        due_date: new Date(due).toISOString(),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        max_marks: maxMarks > 0 ? maxMarks : undefined,
      });
      router.replace(
        `/faculty/courses/${courseId}/assignments/${created.id}/edit`,
      );
      router.refresh();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  if (loading)
    return <p className="t-body text-[var(--text-secondary)]">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href="/faculty/assessments/new"
        className="text-xs text-[var(--text-secondary)] hover:underline"
      >
        ← Back
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New quiz</CardTitle>
          <CardDescription>
            Metadata first, then you&apos;ll add MCQ questions on the next screen. Editing locks once a student starts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="q-course">Course</Label>
            <select
              id="q-course"
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

          <div className="space-y-2">
            <Label htmlFor="q-title">Title</Label>
            <Input
              id="q-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Chapter 3 Quiz"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="q-desc">Description</Label>
            <textarea
              id="q-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex w-full rounded-md border-hair bg-[var(--surface-raised)] px-3 py-2 t-body focus-ora"
              placeholder="Optional — covered topics, time estimate"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="q-due">Due date</Label>
              <Input
                id="q-due"
                type="datetime-local"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-max">Max marks</Label>
              <Input
                id="q-max"
                type="number"
                min={1}
                max={1000}
                value={maxMarks}
                onChange={(e) => setMaxMarks(Number(e.target.value) || 10)}
              />
              <p className="t-caption text-[var(--text-muted)]">
                Per-question points are set in the question editor.
              </p>
            </div>
          </div>

          {error && <p className="t-caption text-[var(--danger-fg)]">{error}</p>}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} loading={saving}>
            {saving ? 'Creating…' : 'Next · add questions'}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Or, import the whole quiz from .docx or .pptx</CardTitle>
          <CardDescription>
            Upload a Word document or PowerPoint deck formatted like{' '}
            <a
              href="/ml_sample_quiz.docx"
              download
              className="underline hover:text-[var(--ember)]"
            >
              ml_sample_quiz.docx
            </a>{' '}
            — numbered questions, lettered options (a., b., c., …), and an{' '}
            <code className="rounded bg-[var(--surface-raised)] px-1 py-0.5 t-caption">
              Answer:
            </code>{' '}
            line per question. The quiz will be created with all questions,
            options, and correct answers pre-filled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="q-docx">.docx or .pptx file</Label>
            <Input
              id="q-docx"
              type="file"
              accept=".docx,.pptx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setDocxFile(f);
                setImportError(null);
              }}
            />
            {docxFile && (
              <p className="t-caption text-[var(--text-muted)]">
                Selected: {docxFile.name} (
                {(docxFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
            <p className="t-caption text-[var(--text-muted)]">
              Due date above is reused. Title falls back to the document&apos;s
              first line; max marks falls back to the sum of per-question
              points.
            </p>
          </div>

          {importError && (
            <p className="t-caption text-[var(--danger-fg)]">{importError}</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={importFromDocx}
            disabled={importing || !docxFile}
            loading={importing}
          >
            {importing ? 'Importing…' : 'Import quiz from .docx / .pptx'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
