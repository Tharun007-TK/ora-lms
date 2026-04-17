import { RoleShell } from '@/components/layout/role-shell';

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="faculty">{children}</RoleShell>;
}
