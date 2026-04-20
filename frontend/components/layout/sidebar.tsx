'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

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
    { href: '/student/calendar', label: 'Calendar' },
    { href: '/student/practice', label: 'Practice' },
    { href: '/student/library', label: 'Library' },
    { href: '/student/judge', label: 'Code Arena' },
    { href: '/student/profile', label: 'Profile' },
  ],
  faculty: [
    { href: '/faculty/dashboard', label: 'Dashboard' },
    { href: '/faculty/courses', label: 'Courses' },
    { href: '/faculty/assessments', label: 'Assessments' },
    { href: '/faculty/calendar', label: 'Calendar' },
    { href: '/faculty/library', label: 'Library' },
    { href: '/faculty/profile', label: 'Profile' },
  ],
  admin: [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/departments', label: 'Departments' },
    { href: '/admin/courses', label: 'Courses' },
    { href: '/admin/calendar', label: 'Calendar' },
    { href: '/admin/library', label: 'Library' },
    { href: '/admin/college', label: 'College' },
    { href: '/admin/judge/problems', label: 'Judge Problems' },
    { href: '/admin/analytics', label: 'Analytics' },
    { href: '/admin/profile', label: 'Profile' },
  ],
};

function SidebarBody({
  role,
  onItemClick,
  showClose,
  onClose,
}: {
  role: UserRole;
  onItemClick?: () => void;
  showClose?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const items = NAV[role];

  return (
    <>
      <div className="mb-6 flex items-start justify-between px-2">
        <div>
          <p className="t-eyebrow">Ora</p>
          <p className="t-label capitalize text-[var(--text-primary)]">
            {role} workspace
          </p>
        </div>
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] focus-ora"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={cn(
                'rounded-md px-3 py-2 t-body-sm transition-colors focus-ora',
                active
                  ? 'bg-[var(--ember)] text-[var(--ember-ink)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function Sidebar({ role }: { role: UserRole }) {
  return (
    <aside className="hidden w-64 shrink-0 border-hair-r bg-[var(--surface-raised)] p-4 lg:block">
      <SidebarBody role={role} />
    </aside>
  );
}

export function MobileDrawer({
  role,
  open,
  onClose,
}: {
  role: UserRole;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <div
      aria-hidden={!open}
      className={cn(
        'fixed inset-0 z-40 lg:hidden',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
    >
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-black/40 transition-opacity',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />
      <aside
        className={cn(
          'absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col border-hair-r bg-[var(--surface-raised)] p-4 transition-transform',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarBody
          role={role}
          onItemClick={onClose}
          showClose
          onClose={onClose}
        />
      </aside>
    </div>
  );
}
