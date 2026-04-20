'use client';

import { useEffect, useState } from 'react';

import { Navbar } from '@/components/layout/navbar';
import { MobileDrawer, Sidebar } from '@/components/layout/sidebar';
import { auth, type User, type UserRole } from '@/lib/api';

export function RoleShell({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    auth
      .me()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        /* middleware redirects */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-[var(--surface-sunken)]">
      <Sidebar role={role} />
      <MobileDrawer
        role={role}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar user={user} onMenuOpen={() => setDrawerOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
