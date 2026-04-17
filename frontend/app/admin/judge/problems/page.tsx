'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { judge, type JudgeProblemBrief } from '@/lib/api';

export default function AdminJudgeProblemsPage() {
  const [items, setItems] = useState<JudgeProblemBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await judge.problems());
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
    if (!confirm('Delete this problem and all submissions?')) return;
    try {
      await judge.deleteProblem(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Judge problems</h1>
          <p className="text-sm text-muted-foreground">
            Create problems with visible + hidden testcases.
          </p>
        </div>
        <Link href="/admin/judge/problems/new">
          <Button>New problem</Button>
        </Link>
      </header>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No problems yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Difficulty</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{p.title}</td>
                  <td className="px-4 py-2 capitalize">{p.difficulty}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(p.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
