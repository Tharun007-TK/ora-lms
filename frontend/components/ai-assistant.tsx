'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ora';
import { API_URL } from '@/lib/api';

interface Source {
  note_id: number;
  note_title: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  pending?: boolean;
}

export function AIAssistant({ courseId }: { courseId: number }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      sourceRef.current?.close();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const onSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const question = input.trim();
    if (!question || streaming) return;

    setInput('');
    setError(null);
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: question },
      { role: 'assistant', content: '', pending: true },
    ]);

    const params = new URLSearchParams({
      course_id: String(courseId),
      question,
    });
    const es = new EventSource(`${API_URL}/ai/chat?${params.toString()}`, {
      withCredentials: true,
    });
    sourceRef.current = es;
    setStreaming(true);

    const finish = () => {
      es.close();
      sourceRef.current = null;
      setStreaming(false);
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 && m.role === 'assistant'
            ? { ...m, pending: false }
            : m,
        ),
      );
    };

    es.onmessage = (evt) => {
      if (!evt.data) return;
      try {
        const payload = JSON.parse(evt.data) as
          | { type: 'meta'; sources: Source[] }
          | { type: 'token'; text: string }
          | { type: 'error'; detail: string }
          | { type: 'done' };

        if (payload.type === 'meta') {
          setMessages((prev) =>
            prev.map((m, i) =>
              i === prev.length - 1
                ? { ...m, sources: payload.sources }
                : m,
            ),
          );
        } else if (payload.type === 'token') {
          setMessages((prev) =>
            prev.map((m, i) =>
              i === prev.length - 1
                ? { ...m, content: m.content + payload.text, pending: false }
                : m,
            ),
          );
        } else if (payload.type === 'error') {
          setError(payload.detail);
          finish();
        } else if (payload.type === 'done') {
          finish();
        }
      } catch {
        /* ignore malformed frame */
      }
    };

    es.onerror = () => {
      setError('Connection dropped. Try again.');
      finish();
    };
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ember)] text-[var(--ember-ink)] shadow-lg transition-transform hover:scale-105"
        aria-label="Open Ora AI Assistant"
      >
        <span className="text-xl font-semibold">✨</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 flex h-[80vh] flex-col rounded-t-2xl border-t bg-[var(--surface-base)] shadow-2xl sm:bottom-6 sm:left-auto sm:right-6 sm:h-[640px] sm:w-[420px] sm:rounded-2xl sm:border"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Ora AI</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Ask about this course
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                aria-label="Close"
              >
                ✕
              </button>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm"
            >
              {messages.length === 0 && (
                <div className="rounded-lg bg-[var(--surface-sunken)]/40 p-3 text-[var(--text-secondary)]">
                  Ask a question grounded in this course's notes. I'll cite
                  which notes I used.
                </div>
              )}
              {messages.map((m, i) => (
                <Bubble key={i} message={m} />
              ))}
              {error && (
                <p className="text-xs text-[var(--danger-fg)]">{error}</p>
              )}
            </div>

            <form
              onSubmit={onSend}
              className="border-t p-3"
            >
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g. Explain BFS vs DFS"
                  disabled={streaming}
                  className="flex-1 rounded-md border border-[var(--surface-border)] bg-[var(--surface-base)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ember)]"
                />
                <Button type="submit" disabled={streaming || !input.trim()}>
                  {streaming ? '…' : 'Ask'}
                </Button>
              </div>
              <p className="mt-2 text-center text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">
                Powered by Ora AI
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={isUser ? 'text-right' : 'text-left'}>
      <div
        className={
          'inline-block max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 ' +
          (isUser
            ? 'bg-[var(--ember)] text-[var(--ember-ink)]'
            : 'bg-[var(--surface-sunken)] text-[var(--text-primary)]')
        }
      >
        {message.pending && !message.content ? (
          <span className="inline-flex items-center gap-1">
            <Dot />
            <Dot delay={150} />
            <Dot delay={300} />
          </span>
        ) : (
          message.content
        )}
      </div>
      {!isUser && message.sources && message.sources.length > 0 && (
        <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
          Sources:{' '}
          {message.sources.map((s, i) => (
            <span key={`${s.note_id}-${i}`}>
              {i > 0 && ', '}
              {s.note_title}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
