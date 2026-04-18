'use client';

import { useRouter } from 'next/navigation';

import { NotificationBell } from '@/components/layout/notification-bell';
import { Button } from '@/components/ora';
import { auth, type User } from '@/lib/api';

export function Navbar({ user }: { user: User | null }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await auth.logout();
    } finally {
      router.replace('/login');
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-hair-b bg-[var(--surface)]/80 px-6 backdrop-blur">
      <div className="t-body-sm text-[var(--text-secondary)]">
        {user ? (
          <span>
            Signed in as{' '}
            <span className="font-medium text-[var(--text-primary)]">{user.name}</span>
            <span className="ml-2 t-eyebrow text-[var(--ember)]">{user.role}</span>
          </span>
        ) : (
          'Loading…'
        )}
      </div>
      <div className="flex items-center gap-3">
        {user && <NotificationBell />}
        <Button variant="secondary" size="sm" onClick={handleLogout}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
