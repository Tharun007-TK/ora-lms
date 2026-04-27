'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useNotifications } from '@/hooks/use-notifications';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function NotificationBell() {
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const handleItemClick = (id: number, read: boolean, link: string | null) => {
    if (!read) markRead(id);
    if (link) {
      setOpen(false);
      router.push(link);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border-hair bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-ora transition-colors"
        aria-label="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--danger-fg)] px-1 text-[10px] font-semibold text-[var(--ember-ink)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 z-20 w-80 overflow-hidden rounded-lg border-hair bg-[var(--surface-raised)]"
          style={{ boxShadow: 'var(--elev-modal)' }}
        >
          <div className="flex items-center justify-between border-hair-b px-3 py-2">
            <p className="t-label text-[var(--text-primary)]">Notifications</p>
            <button
              type="button"
              onClick={markAllRead}
              className="t-caption text-[var(--ember)] hover:underline disabled:opacity-50 focus-ora rounded"
              disabled={unreadCount === 0}
            >
              Mark all as read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-4 text-center t-body-sm text-[var(--text-muted)]">
                You're all caught up.
              </p>
            ) : (
              <ul>
                {items.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => handleItemClick(n.id, n.read, n.link)}
                    className={`cursor-pointer px-3 py-2 t-body-sm border-hair-b hover:bg-[var(--surface-sunken)] transition-colors ${
                      n.read ? 'opacity-70' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-[var(--text-primary)]">
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--ember)]" />
                      )}
                    </div>
                    {n.body && (
                      <p className="mt-0.5 t-caption text-[var(--text-secondary)]">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                      {timeAgo(n.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
