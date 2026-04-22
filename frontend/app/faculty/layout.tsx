import type { ReactNode } from 'react';
import { RoleShell } from '@/components/layout/role-shell';

export default function FacultyLayout({ children }: { children: ReactNode }) {
  return <RoleShell role="faculty">{children}</RoleShell>;
}
