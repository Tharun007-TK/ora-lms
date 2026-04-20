'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button, TBody, TD, TH, THead, TR, Table } from '@/components/ora';
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
          <p className="text-sm text-[var(--text-secondary)]">
            Create problems with visible + hidden testcases.
          </p>
        </div>
        <Link href="/admin/judge/problems/new">
          <Button>New problem</Button>
        </Link>
      </header>

      {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}

      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No problems yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border-hair">
          <Table>
            <THead className="bg-[var(--surface-sunken)]">
              <TR>
                <TH>Title</TH>
                <TH>Difficulty</TH>
                <TH>Created</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {items.map((p) => (
                <TR key={p.id}>
                  <TD className="font-medium">{p.title}</TD>
                  <TD className="capitalize">{p.difficulty}</TD>
                  <TD className="text-[var(--text-secondary)]">
                    {new Date(p.created_at).toLocaleDateString()}
                  </TD>
                  <TD className="text-right">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => onDelete(p.id)}
                    >
                      Delete
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}
