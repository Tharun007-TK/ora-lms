'use client';

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
        className="relative flex h-9 w-9 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-foreground"
        aria-label="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-20 w-80 overflow-hidden rounded-lg border bg-popover shadow-lg">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs text-primary hover:underline disabled:opacity-50"
              disabled={unreadCount === 0}
            >
              Mark all as read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                You're all caught up.
              </p>
            ) : (
              <ul className="divide-y">
                {items.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => !n.read && markRead(n.id)}
                    className={`cursor-pointer px-3 py-2 text-sm hover:bg-accent ${
                      n.read ? 'opacity-70' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{n.title}</p>
                      {!n.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    {n.body && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground">
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
