'use client';

import { useRouter } from 'next/navigation';

import { NotificationBell } from '@/components/layout/notification-bell';
import { Button } from '@/components/ui/button';
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
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-6 backdrop-blur">
      <div className="text-sm text-muted-foreground">
        {user ? (
          <span>
            Signed in as <span className="font-medium text-foreground">{user.name}</span>
            <span className="ml-2 text-xs uppercase tracking-widest text-primary">
              {user.role}
            </span>
          </span>
        ) : (
          'Loading…'
        )}
      </div>
      <div className="flex items-center gap-3">
        {user && <NotificationBell />}
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
