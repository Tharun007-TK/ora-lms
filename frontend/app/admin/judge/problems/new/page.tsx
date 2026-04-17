'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { judge, type ProblemDifficulty } from '@/lib/api';

interface TestcaseDraft {
  input: string;
  expected_output: string;
  is_hidden: boolean;
}

export default function NewProblemPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<ProblemDifficulty>('easy');
  const [description, setDescription] = useState('');
  const [examples, setExamples] = useState('');
  const [constraints, setConstraints] = useState('');
  const [testcases, setTestcases] = useState<TestcaseDraft[]>([
    { input: '', expected_output: '', is_hidden: false },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTc = (i: number, patch: Partial<TestcaseDraft>) => {
    setTestcases((prev) =>
      prev.map((tc, idx) => (idx === i ? { ...tc, ...patch } : tc)),
    );
  };

  const addTc = () =>
    setTestcases((prev) => [
      ...prev,
      { input: '', expected_output: '', is_hidden: false },
    ]);

  const removeTc = (i: number) =>
    setTestcases((prev) => prev.filter((_, idx) => idx !== i));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleaned = testcases.filter(
      (tc) => tc.input.trim() !== '' || tc.expected_output.trim() !== '',
    );
    if (cleaned.length === 0) {
      setError('Add at least one testcase.');
      return;
    }

    setSaving(true);
    try {
      await judge.createProblem({
        title: title.trim(),
        difficulty,
        description: description.trim(),
        examples: examples.trim() || null,
        constraints: constraints.trim() || null,
        testcases: cleaned,
      });
      router.push('/admin/judge/problems');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">New problem</h1>
        <p className="text-sm text-muted-foreground">
          Visible testcases appear in the problem page. Hidden testcases are
          only used for grading.
        </p>
      </header>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
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
            <Label htmlFor="difficulty">Difficulty</Label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as ProblemDifficulty)
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="examples">Examples (optional)</Label>
          <textarea
            id="examples"
            value={examples}
            onChange={(e) => setExamples(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="constraints">Constraints (optional)</Label>
          <textarea
            id="constraints"
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Testcases</h2>
            <Button type="button" size="sm" variant="secondary" onClick={addTc}>
              Add testcase
            </Button>
          </div>
          {testcases.map((tc, i) => (
            <div key={i} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Case {i + 1}</p>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={tc.is_hidden}
                      onChange={(e) =>
                        updateTc(i, { is_hidden: e.target.checked })
                      }
                    />
                    Hidden
                  </label>
                  {testcases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTc(i)}
                      className="text-xs text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <Label className="text-xs">Input (stdin)</Label>
                  <textarea
                    value={tc.input}
                    onChange={(e) => updateTc(i, { input: e.target.value })}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Expected output</Label>
                  <textarea
                    value={tc.expected_output}
                    onChange={(e) =>
                      updateTc(i, { expected_output: e.target.value })
                    }
                    rows={3}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Create problem'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/admin/judge/problems')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
