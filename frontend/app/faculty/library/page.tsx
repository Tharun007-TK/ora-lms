'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { BookCard } from '@/components/book-card';
import { Button } from '@/components/ora';
import { library, type LibraryBook } from '@/lib/api';

export default function FacultyLibraryPage() {
  const [items, setItems] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await library.list();
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (id: number) => {
    if (!confirm('Delete this book?')) return;
    try {
      await library.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Library</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Upload books for your students to read.
          </p>
        </div>
        <Link href="/faculty/library/upload">
          <Button>Upload book</Button>
        </Link>
      </header>

      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      ) : error ? (
        <p className="text-sm text-[var(--danger-fg)]">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">
          Nothing uploaded yet. Hit “Upload book” to add one.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((b) => (
            <BookCard
              key={b.id}
              book={b}
              href={`/student/library/${b.id}`}
              footer={
                <Button size="sm" variant="danger" onClick={() => onDelete(b.id)}>
                  Delete
                </Button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
