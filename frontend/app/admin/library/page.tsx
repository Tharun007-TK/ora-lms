'use client';

import { useEffect, useState } from 'react';

import { BookCard } from '@/components/book-card';
import { Button } from '@/components/ui/button';
import { library, type LibraryBook } from '@/lib/api';

export default function AdminLibraryPage() {
  const [items, setItems] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await library.list());
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
      <header>
        <h1 className="text-2xl font-semibold">Library</h1>
        <p className="text-sm text-muted-foreground">
          All uploads across faculty. Admins can remove any book.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No books uploaded yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((b) => (
            <BookCard
              key={b.id}
              book={b}
              href={`/student/library/${b.id}`}
              footer={
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(b.id)}
                >
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
