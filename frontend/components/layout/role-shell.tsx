'use client';

import { useEffect, useState } from 'react';

import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { auth, type User, type UserRole } from '@/lib/api';

export function RoleShell({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);

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
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar user={user} />
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
