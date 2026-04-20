'use client';

import { useParams } from 'next/navigation';

import { CodingSolver } from '@/components/coding-solver';

export default function GradedCodingSolvePage() {
  const params = useParams<{ id: string; aid: string }>();
  const courseId = Number(params.id);
  const aid = Number(params.aid);
  if (!Number.isFinite(aid)) return null;
  return (
    <CodingSolver
      assessmentId={aid}
      backHref={`/student/courses/${courseId}/assignments`}
    />
  );
}
