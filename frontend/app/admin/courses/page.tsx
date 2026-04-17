'use client';

import { useEffect, useState } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { courses, users, type Course, type UserBrief } from '@/lib/api';

export default function AdminCoursesPage() {
  const [items, setItems] = useState<Course[]>([]);
  const [faculty, setFaculty] = useState<UserBrief[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<number, number | ''>>({});

  const load = async () => {
    try {
      const [cs, fs] = await Promise.all([courses.list(), users.faculty()]);
      setItems(cs);
      setFaculty(fs);
      setDraft(
        Object.fromEntries(cs.map((c) => [c.id, c.faculty_id ?? ''])) as Record<
          number,
          number | ''
        >,
      );
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

  const save = async (course: Course) => {
    setSaving(course.id);
    setError(null);
    try {
      const nextId = draft[course.id];
      await courses.update(course.id, {
        faculty_id: nextId === '' ? null : Number(nextId),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(null);
    }
  };

  const remove = async (course: Course) => {
    if (!confirm(`Delete course ${course.code}?`)) return;
    setSaving(course.id);
    try {
      await courses.remove(course.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Courses</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No courses yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((c) => {
            const value = draft[c.id];
            return (
              <Card key={c.id}>
                <CardHeader>
                  <CardTitle>{c.title}</CardTitle>
                  <CardDescription>
                    {c.code} · {c.enrollment_count ?? 0} enrolled
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">
                      Assigned faculty
                    </span>
                    <select
                      value={value === undefined ? '' : String(value)}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [c.id]: e.target.value === '' ? '' : Number(e.target.value),
                        }))
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Unassigned</option>
                      {faculty.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} · {f.email}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => save(c)}
                      disabled={saving === c.id || draft[c.id] === c.faculty_id}
                    >
                      {saving === c.id ? 'Saving…' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => remove(c)}
                      disabled={saving === c.id}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
