'use client';

import Link from 'next/link';
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
import { ai, type Note } from '@/lib/api';

export default function GenerateNotesPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const courseId = Number(params?.id);

  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [keepPdf, setKeepPdf] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Note | null>(null);

  const onGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!file || !title.trim()) {
      setError('Title and PDF are required.');
      return;
    }
    setGenerating(true);
    setPreview(null);
    try {
      const note = await ai.generateNotes({
        courseId,
        title: title.trim(),
        file,
        keepPdf,
      });
      setPreview(note);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={`/faculty/courses/${courseId}/notes`}
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Back to notes
        </Link>
        <h1 className="text-2xl font-semibold">AI Notes Maker</h1>
        <p className="text-sm text-muted-foreground">
          Upload a chapter PDF. Groq converts the raw content into structured,
          student-ready Markdown notes.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Generate from PDF</CardTitle>
          <CardDescription>
            Large PDFs are chunked; expect 10–30 s depending on length.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onGenerate}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Note title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Chapter 3: Graph Algorithms"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="file">Chapter PDF</Label>
              <Input
                id="file"
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  {file.name} · {(file.size / 1024).toFixed(0)} KB
                </p>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={keepPdf}
                onChange={(e) => setKeepPdf(e.target.checked)}
              />
              Keep the source PDF attached to the note
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(`/faculty/courses/${courseId}/notes`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={generating}>
              {generating ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
                  <span
                    className="h-2 w-2 animate-pulse rounded-full bg-current"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="h-2 w-2 animate-pulse rounded-full bg-current"
                    style={{ animationDelay: '300ms' }}
                  />
                  Generating
                </span>
              ) : (
                'Generate notes'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{preview.title}</CardTitle>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                AI
              </span>
            </div>
            <CardDescription>
              Saved to this course. Review it here or open the full notes list.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
              {preview.content}
            </pre>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setPreview(null);
                setTitle('');
                setFile(null);
              }}
            >
              Generate another
            </Button>
            <Button
              onClick={() => router.push(`/faculty/courses/${courseId}/notes`)}
            >
              Go to notes
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
