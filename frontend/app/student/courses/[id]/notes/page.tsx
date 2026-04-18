'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AIAssistant } from '@/components/ai-assistant';
import { NoteCard } from '@/components/note-card';
import { notes, type Note } from '@/lib/api';

export default function StudentNotesPage() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);
  const [items, setItems] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    notes
      .list(courseId)
      .then((data) => !cancelled && setItems(data))
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load notes');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={`/student/courses/${courseId}`}
          className="text-xs text-[var(--text-secondary)] hover:underline"
        >
          ← Back to course
        </Link>
        <h1 className="text-2xl font-semibold">Notes</h1>
      </header>

      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      ) : error ? (
        <p className="text-sm text-[var(--danger-fg)]">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">
          No notes have been published for this course yet.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((n) => (
            <NoteCard key={n.id} note={n} />
          ))}
        </div>
      )}

      <AIAssistant courseId={courseId} />
    </div>
  );
}
