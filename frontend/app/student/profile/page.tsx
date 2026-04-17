'use client';

import { useEffect, useState } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { auth, type User } from '@/lib/api';

export default function StudentProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    auth.me().then(setUser).catch(() => {});
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>{user?.name ?? '—'}</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Role: {user?.role} · Joined{' '}
          {user?.created_at
            ? new Date(user.created_at).toLocaleDateString()
            : '—'}
        </CardContent>
      </Card>
    </div>
  );
}
