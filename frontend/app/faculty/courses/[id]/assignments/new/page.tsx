'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { assignments } from '@/lib/api';

export default function NewAssignmentPage() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [due, setDue] = useState('');
  const [maxMarks, setMaxMarks] = useState(100);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!title.trim() || !due) {
      setError('Title and due date are required.');
      return;
    }
    setSaving(true);
    try {
      await assignments.create(courseId, {
        title,
        description: description || null,
        due_date: new Date(due).toISOString(),
        max_marks: maxMarks,
      });
      router.replace(`/faculty/courses/${courseId}/assignments`);
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
            <Label htmlFor="a-title">Title</Label>
            <Input
              id="a-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Problem set 2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="a-desc">Description</Label>
            <textarea
              id="a-desc"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Creating…' : 'Create assignment'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
