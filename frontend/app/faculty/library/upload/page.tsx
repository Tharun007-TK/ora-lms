'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ora';
import { Input } from '@/components/ora';
import { Label } from '@/components/ora';
import { library } from '@/lib/api';

export default function LibraryUploadPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !author.trim() || !file) {
      setError('Title, author, and PDF are required.');
      return;
    }
    setSubmitting(true);
    try {
      await library.upload({
        title: title.trim(),
        author: author.trim(),
        category: category.trim() || null,
        file,
        cover,
      });
      router.push('/faculty/library');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Upload book</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          PDF is required. Cover image is optional.
        </p>
      </header>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="author">Author</Label>
          <Input
            id="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Algorithms, Electronics"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="file">Book PDF</Label>
          <Input
            id="file"
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cover">Cover image (optional)</Label>
          <Input
            id="cover"
            type="file"
            accept="image/*"
            onChange={(e) => setCover(e.target.files?.[0] ?? null)}
          />
        </div>

        {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Uploading…' : 'Upload'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/faculty/library')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
