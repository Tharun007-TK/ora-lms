'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useBreadcrumbs } from '@/components/breadcrumbs';
import { NoteCard } from '@/components/note-card';
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
import { notes, type Note } from '@/lib/api';

export default function FacultyNotesPage() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);
  const [items, setItems] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setItems(await notes.list(courseId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Number.isFinite(courseId)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useBreadcrumbs([
    { label: 'Courses', href: '/faculty/courses' },
    { label: 'Course', href: `/faculty/courses/${courseId}` },
    { label: 'Notes' },
  ]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await notes.create(courseId, {
        title,
        content: content || undefined,
        file,
      });
      setTitle('');
      setContent('');
      setFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await notes.remove(courseId, id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Link
            href={`/faculty/courses/${courseId}`}
            className="text-xs text-[var(--text-secondary)] hover:underline"
          >
            ← Back to course
          </Link>
          <h1 className="text-2xl font-semibold">Notes</h1>
        </div>
        <Link href={`/faculty/courses/${courseId}/notes/generate`}>
          <Button variant="secondary">AI Notes Maker</Button>
        </Link>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Publish a note</CardTitle>
          <CardDescription>
            Attach a PDF/document, write content, or both. For auto-structured
            notes, use the AI Notes Maker.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Chapter 3: Trees"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note-content">Content (optional)</Label>
            <textarea
              id="note-content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex w-full rounded-md border border-[var(--surface-border)] bg-[var(--surface-base)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ember)]"
              placeholder="Markdown-friendly text"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note-file">Attachment (optional)</Label>
            <Input
              id="note-file"
              type="file"
              accept="application/pdf,.doc,.docx,.md,.txt"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-xs text-[var(--text-secondary)]">Selected: {file.name}</p>
            )}
          </div>
          {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            onClick={submit}
            disabled={saving || !title.trim() || (!content.trim() && !file)}
          >
            {saving ? 'Publishing…' : 'Publish note'}
          </Button>
        </CardFooter>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Existing notes</h2>
        {loading ? (
          <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Nothing published yet.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                canDelete
                onDelete={() => remove(n.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
