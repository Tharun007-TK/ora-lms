'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

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
import { assignments, type AssignmentType } from '@/lib/api';

type AssessmentType = AssignmentType | 'coding';

export default function NewAssignmentPage() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [due, setDue] = useState('');
  const [maxMarks, setMaxMarks] = useState(100);
  const [type, setType] = useState<AssessmentType>('file');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (type === 'coding') {
      router.replace(`/faculty/courses/${courseId}/assignments/new-coding`);
      return;
    }
    if (!title.trim() || !due) {
      setError('Title and due date are required.');
      return;
    }
    setSaving(true);
    try {
      const created = await assignments.create(courseId, {
        title,
        description: description || null,
        due_date: new Date(due).toISOString(),
        max_marks: maxMarks,
        type: type as AssignmentType,
      });
      if (type === 'quiz') {
        router.replace(
          `/faculty/courses/${courseId}/assignments/${created.id}/edit`,
        );
      } else {
        router.replace(`/faculty/courses/${courseId}/assignments`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>New assignment</CardTitle>
          <CardDescription>
            Enrolled students will be notified immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setType('file')}
                className={`flex-1 rounded-md border-hair px-3 py-2 text-sm font-medium transition-colors ${
                  type === 'file'
                    ? 'bg-[var(--ember)] text-[var(--ember-ink)]'
                    : 'bg-[var(--surface-raised)] text-[var(--text-secondary)]'
                }`}
              >
                File upload
              </button>
              <button
                type="button"
                onClick={() => setType('quiz')}
                className={`flex-1 rounded-md border-hair px-3 py-2 text-sm font-medium transition-colors ${
                  type === 'quiz'
                    ? 'bg-[var(--ember)] text-[var(--ember-ink)]'
                    : 'bg-[var(--surface-raised)] text-[var(--text-secondary)]'
                }`}
              >
                Quiz (MCQ)
              </button>
              <button
                type="button"
                onClick={() => setType('coding')}
                className={`flex-1 rounded-md border-hair px-3 py-2 text-sm font-medium transition-colors ${
                  type === 'coding'
                    ? 'bg-[var(--ember)] text-[var(--ember-ink)]'
                    : 'bg-[var(--surface-raised)] text-[var(--text-secondary)]'
                }`}
              >
                Coding
              </button>
            </div>
            {type === 'quiz' && (
              <p className="t-caption text-[var(--text-muted)]">
                After creating, you&apos;ll add questions on the next screen. Editing locks once any student starts the attempt.
              </p>
            )}
            {type === 'coding' && (
              <p className="t-caption text-[var(--text-muted)]">
                Full form for languages, test cases, scoring, and practice-mode on the next screen.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="a-title">Title</Label>
            <Input
              id="a-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'quiz' ? 'Chapter 1 Quiz' : 'Problem set 2'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="a-desc">Description</Label>
            <textarea
              id="a-desc"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex w-full rounded-md border-hair bg-[var(--surface-base)] px-3 py-2 text-sm focus-ora"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="a-due">Due date</Label>
              <Input
                id="a-due"
                type="datetime-local"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-max">Max marks</Label>
              <Input
                id="a-max"
                type="number"
                min={1}
                max={1000}
                value={maxMarks}
                onChange={(e) => setMaxMarks(Number(e.target.value))}
              />
              {type === 'quiz' && (
                <p className="t-caption text-[var(--text-muted)]">
                  Quiz score is computed from question points; max_marks is just a label.
                </p>
              )}
            </div>
          </div>
          {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} loading={saving}>
            {saving
              ? 'Creating…'
              : type === 'quiz'
              ? 'Create & add questions'
              : 'Create assignment'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
