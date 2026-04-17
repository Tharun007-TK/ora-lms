'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
        <p className="text-sm text-muted-foreground">
          Departments appear on the public college pages.
        </p>
      </header>

      <form
        onSubmit={onCreate}
        className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-4 sm:items-end"
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No departments yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{d.code}</td>
                  <td className="px-4 py-2">{d.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {d.description || '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(d.id)}
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
