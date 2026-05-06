'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { Breadcrumbs, BreadcrumbProvider } from '@/components/breadcrumbs';
import { Navbar } from '@/components/layout/navbar';
import { MobileDrawer, Sidebar } from '@/components/layout/sidebar';
import { auth, type User, type UserRole } from '@/lib/api';

export function RoleShell({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [authDone, setAuthDone] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    auth
      .me()
      .then((u) => { if (!cancelled) setUser(u); })
      .catch(() => {
        // 401 already triggers redirect via apiFetch.
        // Other failures leave the middleware-verified session intact.
      })
      .finally(() => { if (!cancelled) setAuthDone(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <BreadcrumbProvider>
      <div className="flex min-h-screen bg-[var(--surface-sunken)]">
        <Sidebar role={role} />
        <MobileDrawer
          role={role}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar user={user} role={role} authDone={authDone} onMenuOpen={() => setDrawerOpen(true)} />
          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
            <div className="mb-4">
              <Breadcrumbs />
            </div>
            {children}
          </main>
        </div>
      </div>
    </BreadcrumbProvider>
  );
}
