'use client';

import { Code2, FileText, ListChecks } from 'lucide-react';
import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ora';

const TYPES = [
  {
    href: '/faculty/assessments/new/assignment',
    label: 'Assignment',
    icon: FileText,
    summary:
      'File-upload assignment. Students submit a PDF/doc; you grade manually.',
    example: 'Problem set · Report · Worksheet',
  },
  {
    href: '/faculty/assessments/new/quiz',
    label: 'Quiz',
    icon: ListChecks,
    summary:
      'Multiple-choice questions, auto-graded on submit. One attempt per student.',
    example: 'Concept check · Chapter test',
  },
  {
    href: '/faculty/assessments/new/coding',
    label: 'Coding',
    icon: Code2,
    summary:
      'Code challenge run through Judge0. Students code, run, and submit — results graded against test cases.',
    example: 'HackerRank-style problem · Lab exercise · Practice',
  },
];

export default function NewAssessmentTypePage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href="/faculty/assessments"
          className="text-xs text-[var(--text-secondary)] hover:underline"
        >
          ← Back to Assessments
        </Link>
        <h1 className="text-2xl font-semibold">New assessment</h1>
        <p className="t-body text-[var(--text-secondary)]">
          Pick the type that fits how students will answer.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href} className="focus-ora rounded-lg">
              <Card className="h-full transition-colors hover:border-[var(--ember)]">
                <CardHeader>
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--surface-sunken)] text-[var(--ember)]">
                    <Icon size={20} />
                  </div>
                  <CardTitle>{t.label}</CardTitle>
                  <CardDescription>{t.example}</CardDescription>
                </CardHeader>
                <CardContent className="t-body text-[var(--text-secondary)]">
                  {t.summary}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
