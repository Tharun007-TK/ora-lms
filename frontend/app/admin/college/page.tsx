'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ora';
import { Input } from '@/components/ora';
import { Label } from '@/components/ora';
import { college, type CollegeInfo } from '@/lib/api';

export default function AdminCollegePage() {
  const [about, setAbout] = useState('');
  const [vision, setVision] = useState('');
  const [mission, setMission] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<CollegeInfo | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await college.info().catch(() => null);
        if (data) {
          setInfo(data);
          setAbout(data.about ?? '');
          setVision(data.vision ?? '');
          setMission(data.mission ?? '');
          setYear(data.established_year ? String(data.established_year) : '');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const parsedYear = year.trim() ? Number(year) : null;
      const updated = await college.updateInfo({
        about: about.trim() || null,
        vision: vision.trim() || null,
        mission: mission.trim() || null,
        established_year:
          parsedYear !== null && Number.isFinite(parsedYear) ? parsedYear : null,
      });
      setInfo(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-[var(--text-secondary)]">Loading…</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">College info</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Shown on the public <code className="text-xs">/college</code> page.
        </p>
      </header>

      <form className="space-y-4" onSubmit={onSave}>
        <div className="space-y-1.5">
          <Label htmlFor="year">Established year</Label>
          <Input
            id="year"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="max-w-[160px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="about">About</Label>
          <textarea
            id="about"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={5}
            className="w-full rounded-md border border-[var(--surface-border)] bg-[var(--surface-base)] px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vision">Vision</Label>
          <textarea
            id="vision"
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-[var(--surface-border)] bg-[var(--surface-base)] px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mission">Mission</Label>
          <textarea
            id="mission"
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-[var(--surface-border)] bg-[var(--surface-base)] px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-[var(--danger-fg)]">{error}</p>}
        {info && (
          <p className="text-xs text-[var(--text-secondary)]">
            Last updated {new Date(info.updated_at).toLocaleString()}
          </p>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </div>
  );
}
