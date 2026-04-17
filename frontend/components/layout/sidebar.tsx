'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { UserRole } from '@/lib/api';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
}

const NAV: Record<UserRole, NavItem[]> = {
  student: [
    { href: '/student/dashboard', label: 'Dashboard' },
    { href: '/student/courses', label: 'Courses' },
    { href: '/student/assignments', label: 'Assignments' },
    { href: '/student/library', label: 'Library' },
    { href: '/student/judge', label: 'Code Judge' },
    { href: '/student/profile', label: 'Profile' },
  ],
  faculty: [
    { href: '/faculty/dashboard', label: 'Dashboard' },
    { href: '/faculty/courses', label: 'Courses' },
    { href: '/faculty/library', label: 'Library' },
    { href: '/faculty/profile', label: 'Profile' },
  ],
  admin: [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/departments', label: 'Departments' },
    { href: '/admin/courses', label: 'Courses' },
    { href: '/admin/library', label: 'Library' },
    { href: '/admin/college', label: 'College' },
    { href: '/admin/judge/problems', label: 'Judge Problems' },
    { href: '/admin/analytics', label: 'Analytics' },
  ],
};

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = NAV[role];

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card p-4 md:block">
      <div className="mb-6 px-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Ora
        </p>
        <p className="text-sm font-semibold capitalize">{role} workspace</p>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
