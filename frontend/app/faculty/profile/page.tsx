'use client';

import { useEffect, useState } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ora';
import { auth, type User } from '@/lib/api';

export default function FacultyProfilePage() {
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
        <CardContent className="text-sm text-[var(--text-secondary)]">
          Role: {user?.role}
        </CardContent>
      </Card>
    </div>
  );
}
