'use client';

import { LogOut, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { NotificationBell } from '@/components/layout/notification-bell';
import { Avatar, Button } from '@/components/ora';
import { auth, type User } from '@/lib/api';

export function Navbar({
  user,
  onMenuOpen,
}: {
  user: User | null;
  onMenuOpen?: () => void;
}) {
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
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-hair-b bg-[var(--surface)]/80 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        {onMenuOpen && (
          <button
            type="button"
            onClick={onMenuOpen}
            aria-label="Open menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] focus-ora lg:hidden"
          >
            <Menu size={18} />
          </button>
        )}
        <div className="min-w-0 t-body-sm text-[var(--text-secondary)]">
          {user ? (
            <>
              <span className="hidden sm:inline">
                Signed in as{' '}
                <span className="font-medium text-[var(--text-primary)]">
                  {user.name}
                </span>
                <span className="ml-2 t-eyebrow text-[var(--ember)]">
                  {user.role}
                </span>
              </span>
              <span className="flex items-center gap-2 sm:hidden">
                <Avatar fallback={user.name} size="sm" alt={user.name} />
                <span className="min-w-0 truncate font-medium text-[var(--text-primary)]">
                  {user.name}
                </span>
              </span>
            </>
          ) : (
            'Loading…'
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {user && <NotificationBell />}
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Sign out"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border-hair bg-[var(--surface-raised)] text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] focus-ora sm:hidden"
        >
          <LogOut size={16} />
        </button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleLogout}
          className="hidden sm:inline-flex"
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}
