'use client';

import { useRouter } from 'next/navigation';
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
import { courses } from '@/lib/api';

export default function NewCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [semester, setSemester] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await courses.create({
        title,
        code,
        semester: semester || null,
        description: description || null,
      });
      router.replace(`/faculty/courses/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create course');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Create a course</CardTitle>
          <CardDescription>
            Course codes are shown to students and must be unique.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Data Structures and Algorithms"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CS201"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Input
                id="semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="Spring 2026"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="What will students learn?"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={saving || !title.trim() || !code.trim()}
          >
            {saving ? 'Creating…' : 'Create course'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
