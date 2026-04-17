'use client';

import { useEffect, useMemo, useState } from 'react';

import { BookCard } from '@/components/book-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { library, type LibraryBook } from '@/lib/api';

export default function StudentLibraryPage() {
  const [items, setItems] = useState<LibraryBook[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [books, cats] = await Promise.all([
        library.list({
          category: category || undefined,
          q: q.trim() || undefined,
        }),
        library.categories(),
      ]);
      setItems(books);
      setCategories(cats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const filterBadges = useMemo(() => ['All', ...categories], [categories]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Library</h1>
        <p className="text-sm text-muted-foreground">
          Browse books uploaded by faculty. Download via the book page.
        </p>
      </header>

      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <Input
          placeholder="Search by title or author"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:max-w-sm"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {filterBadges.map((c) => {
          const active = (c === 'All' && !category) || c === category;
          return (
            <button
              key={c}
              onClick={() => setCategory(c === 'All' ? null : c)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No books match your filters.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((b) => (
            <BookCard key={b.id} book={b} href={`/student/library/${b.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
