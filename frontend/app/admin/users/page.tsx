'use client';

import { useEffect, useState } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
      <h1 className="text-2xl font-semibold">Users</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((u) => (
            <Card key={u.id}>
              <CardHeader>
                <CardTitle className="text-base">{u.name}</CardTitle>
                <CardDescription>{u.email}</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Role: {u.role} · {u.is_active ? 'active' : 'disabled'}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
