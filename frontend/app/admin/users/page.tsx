'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ora';
import { users, type User } from '@/lib/api';

export default function AdminUsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    users
      .list()
      .then(setItems)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load'),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Button asChild size="sm">
          <Link href="/admin/users/import">+ Import students (CSV)</Link>
        </Button>
      </header>
      {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}
      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((u) => (
            <Card key={u.id}>
              <CardHeader>
                <CardTitle className="text-base">{u.name}</CardTitle>
                <CardDescription>{u.email}</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-[var(--text-secondary)]">
                Role: {u.role} · {u.is_active ? 'active' : 'disabled'}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
