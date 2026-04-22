import type { ReactNode } from 'react';
import { RoleShell } from '@/components/layout/role-shell';

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <RoleShell role="student">{children}</RoleShell>;
}
