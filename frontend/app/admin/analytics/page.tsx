'use client';

import { useState } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ora';
import {
  analytics,
  downloadFile,
  type AssessmentSummaryKind,
} from '@/lib/api';

type FilterKey = 'all' | AssessmentSummaryKind;

const FILTERS: { key: FilterKey; label: string; description: string }[] = [
  {
    key: 'all',
    label: 'All assessments',
    description: 'Combined report — file submissions, quizzes, and coding.',
  },
  {
    key: 'file',
    label: 'File assignments',
    description: 'Per-assignment completion, average marks, late count.',
  },
  {
    key: 'quiz',
    label: 'Quizzes',
    description: 'Quiz attempts summary — completion, average score, late count.',
  },
  {
    key: 'coding',
    label: 'Coding assessments',
    description: 'Best-per-student score rollup, completion, late submissions.',
  },
];

export default function AdminAnalyticsPage() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const exportSummary = async () => {
    setExporting(true);
    setError(null);
    setHint(null);
    try {
      const url = analytics.summaryCsvUrl(
        filter === 'all' ? undefined : { kind: filter },
      );
      await downloadFile(url, `assessment_summary_${filter}.csv`);
      setHint('Download started.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="t-body text-[var(--text-secondary)]">
          Per-assessment summary reports across every course. Pick a category
          and download a CSV.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`text-left rounded-lg border-hair p-4 transition-colors ${
              filter === f.key
                ? 'bg-[var(--ember)]/10 border-[var(--ember)]'
                : 'bg-[var(--surface-raised)] hover:bg-[var(--surface-sunken)]'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium">{f.label}</span>
              {filter === f.key && (
                <span className="t-caption text-[var(--ember)]">selected</span>
              )}
            </div>
            <span className="block t-caption text-[var(--text-muted)] mt-1">
              {f.description}
            </span>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary CSV</CardTitle>
          <CardDescription>
            Columns: course, type, title, due_date, total_enrolled, completed,
            completion_rate, avg_score, max_score, top_score, late_count,
            avg_percentage.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button onClick={exportSummary} disabled={exporting}>
            {exporting ? 'Exporting…' : `Download ${filter === 'all' ? 'all' : filter} CSV`}
          </Button>
          {hint && (
            <span className="t-caption text-[var(--text-secondary)]">{hint}</span>
          )}
          {error && (
            <span className="t-caption text-[var(--danger-fg)]">{error}</span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-quiz question analysis</CardTitle>
          <CardDescription>
            Drill-down per-question correct% lives on each quiz leaderboard
            page under Faculty → Assessments. Open a quiz, then click Question
            analysis CSV.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
