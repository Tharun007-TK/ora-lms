'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ora';

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-[var(--danger-fg)]/5 p-6">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-[var(--text-secondary)]">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
