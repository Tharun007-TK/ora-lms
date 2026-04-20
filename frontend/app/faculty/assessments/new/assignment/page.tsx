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

export default function NewAssignmentAssessmentPage() {
  const router = useRouter();

  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [due, setDue] = useState('');
  const [maxMarks, setMaxMarks] = useState(100);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    courses
      .list({ mine: true })
      .then((list) => {
        setMyCourses(list);
        if (list[0]) setCourseId(list[0].id);
      })
      .catch((err: Error) => setError(err.message || 'Failed to load courses'))
      .finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    setError(null);
    if (courseId == null) return setError('Pick a course.');
    if (!title.trim()) return setError('Title required.');
    if (!due) return setError('Due date required.');
    setSaving(true);
    try {
      await assignments.create(courseId, {
        title,
        description: description || null,
        due_date: new Date(due).toISOString(),
        max_marks: maxMarks,
        type: 'file',
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
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href="/faculty/assessments/new"
        className="text-xs text-[var(--text-secondary)] hover:underline"
      >
        ← Back
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New file assignment</CardTitle>
          <CardDescription>
            Students upload a file; you grade manually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="a-course">Course</Label>
            <select
              id="a-course"
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
            <Label htmlFor="a-title">Title</Label>
            <Input
              id="a-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Problem Set 3"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="a-desc">Description</Label>
            <textarea
              id="a-desc"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex w-full rounded-md border-hair bg-[var(--surface-raised)] px-3 py-2 t-body focus-ora"
              placeholder="What should students submit? Format? Page limit?"
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
                onChange={(e) => setMaxMarks(Number(e.target.value) || 100)}
              />
            </div>
          </div>

          {error && <p className="t-caption text-[var(--danger-fg)]">{error}</p>}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} loading={saving}>
            {saving ? 'Creating…' : 'Post assignment'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
