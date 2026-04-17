'use client';

import { useEffect, useRef, useState } from 'react';

import {
  API_URL,
  notifications as notificationsApi,
  type Notification,
} from '@/lib/api';

export function useNotifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const esRef = useRef<EventSource | null>(null);

  const load = async () => {
    try {
      const data = await notificationsApi.list({ limit: 30 });
      setItems(data);
    } catch {
      // ignore — bell just shows empty on failure
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const es = new EventSource(`${API_URL}/notifications/stream`, {
      withCredentials: true,
    });
    esRef.current = es;

    es.onmessage = (evt) => {
      if (!evt.data) return;
      try {
        const payload = JSON.parse(evt.data) as Notification;
        setItems((prev) => {
          if (prev.some((n) => n.id === payload.id)) return prev;
          return [payload, ...prev].slice(0, 30);
        });
      } catch {
        /* ignore */
      }
    };

    es.onerror = () => {
      // Let the browser retry automatically; nothing to do here.
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  const markRead = async (id: number) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    try {
      await notificationsApi.markRead(id);
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await notificationsApi.markAllRead();
    } catch {
      /* ignore */
    }
  };

  const unreadCount = items.filter((n) => !n.read).length;

  return { items, loading, unreadCount, markRead, markAllRead, reload: load };
}
