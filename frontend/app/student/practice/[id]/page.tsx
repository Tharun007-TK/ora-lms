'use client';

import { useParams } from 'next/navigation';

import { CodingSolver } from '@/components/coding-solver';

export default function PracticeSolvePage() {
  const params = useParams<{ id: string }>();
  const assessmentId = Number(params.id);
  if (!Number.isFinite(assessmentId)) return null;
  return (
    <CodingSolver assessmentId={assessmentId} backHref="/student/practice" />
  );
}
