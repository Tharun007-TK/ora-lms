'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewAssignmentRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/faculty/assessments/new');
  }, [router]);
  return null;
}
