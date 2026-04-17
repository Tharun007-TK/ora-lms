'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { courses, type Course } from '@/lib/api';

export default function AdminDashboardPage() {
  const [all, setAll] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    courses
      .list()
      .then(setAll)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load'),
      );
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin dashboard</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Courses</CardTitle>
            <CardDescription>Total courses in the catalog.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{all.length}</p>
            <Link
              href="/admin/courses"
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            >
              Manage →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Students, faculty, and admins.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/users"
              className="text-sm font-medium text-primary hover:underline"
            >
              Manage →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
            <CardDescription>Academic departments.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/departments"
              className="text-sm font-medium text-primary hover:underline"
            >
              Manage →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
