'use client';

import { useEffect, useState } from 'react';

import {
  Button,
  Input,
  Label,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@/components/ora';
import { college, type Department } from '@/lib/api';

export default function AdminDepartmentsPage() {
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await college.departments());
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

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setSubmitting(true);
    try {
      await college.createDepartment({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || null,
      });
      setName('');
      setCode('');
      setDescription('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm('Delete this department?')) return;
    try {
      await college.removeDepartment(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Departments</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Departments appear on the public college pages.
        </p>
      </header>

      <form
        onSubmit={onCreate}
        className="grid gap-3 rounded-lg border bg-[var(--surface-raised)] p-4 sm:grid-cols-4 sm:items-end"
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            maxLength={20}
          />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add'}
        </Button>
        <div className="space-y-1.5 sm:col-span-4">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </form>

      {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}

      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No departments yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border-hair">
          <Table>
            <THead className="bg-[var(--surface-sunken)]">
              <TR>
                <TH>Code</TH>
                <TH>Name</TH>
                <TH>Description</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {items.map((d) => (
                <TR key={d.id}>
                  <TD className="font-medium">{d.code}</TD>
                  <TD>{d.name}</TD>
                  <TD className="text-[var(--text-secondary)]">
                    {d.description || '—'}
                  </TD>
                  <TD className="text-right">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => onDelete(d.id)}
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
