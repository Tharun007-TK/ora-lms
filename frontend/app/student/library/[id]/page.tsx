'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ora';
import { fileUrl, library, type LibraryBook } from '@/lib/api';

export default function StudentBookDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const [book, setBook] = useState<LibraryBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await library.get(id);
        if (!cancelled) setBook(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <p className="text-sm text-[var(--text-secondary)]">Loading…</p>;
  }
  if (error || !book) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--danger-fg)]">{error || 'Book not found.'}</p>
        <Link href="/student/library" className="text-sm underline">
          Back to library
        </Link>
      </div>
    );
  }

  const cover = fileUrl(book.cover_url);
  const file = fileUrl(book.file_url);

  return (
    <div className="grid gap-6 md:grid-cols-[240px_1fr]">
      <div className="overflow-hidden rounded-lg border bg-[var(--surface-sunken)]">
        <div className="aspect-[3/4] w-full">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={book.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-[var(--text-secondary)]">
              No cover
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          {book.category && (
            <span className="rounded bg-[var(--surface-sunken)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
              {book.category}
            </span>
          )}
          <h1 className="text-2xl font-semibold">{book.title}</h1>
          <p className="text-sm text-[var(--text-secondary)]">by {book.author}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {file ? (
            <a href={file} target="_blank" rel="noreferrer">
              <Button>Open PDF</Button>
            </a>
          ) : (
            <Button disabled>File unavailable</Button>
          )}
          <Link href="/student/library">
            <Button variant="secondary">Back</Button>
          </Link>
        </div>

        <p className="text-xs text-[var(--text-secondary)]">
          Added {new Date(book.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
