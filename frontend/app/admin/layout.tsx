import type { ReactNode } from 'react';
import { RoleShell } from '@/components/layout/role-shell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RoleShell role="admin">{children}</RoleShell>;
}
