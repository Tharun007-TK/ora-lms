'use client';

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ora';
import {
  calendar,
  type CalendarEvent,
  type CalendarEventStatus,
  type UserRole,
} from '@/lib/api';

interface Props {
  role: UserRole;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function statusChipClass(status: CalendarEventStatus): string {
  switch (status) {
    case 'overdue':
      return 'bg-[var(--danger-bg)] text-[var(--danger-fg)] border-l-2 border-[var(--danger-fg)]';
    case 'submitted':
      return 'bg-[var(--ember)] text-[var(--ember-ink)] border-l-2 border-[var(--ember)]';
    case 'graded':
      return 'bg-[var(--success-bg)] text-[var(--success-fg)] border-l-2 border-[var(--success-fg)]';
    case 'pending':
    default:
      return 'bg-[var(--surface-sunken)] text-[var(--text-primary)] border-l-2 border-[var(--text-muted)]';
  }
}

function statusToTone(
  status: CalendarEventStatus,
): 'neutral' | 'ember' | 'success' | 'danger' {
  switch (status) {
    case 'overdue':
      return 'danger';
    case 'submitted':
      return 'ember';
    case 'graded':
      return 'success';
    case 'pending':
    default:
      return 'neutral';
  }
}

function eventHref(role: UserRole, ev: CalendarEvent): string {
  const [, aid] = ev.id.split(':');
  if (role === 'student' && ev.type === 'quiz') {
    return `/student/courses/${ev.course_id}/assignments/${aid}/attempt`;
  }
  if (role === 'student') {
    return `/student/courses/${ev.course_id}/assignments`;
  }
  if (role === 'faculty' && ev.type === 'quiz') {
    return `/faculty/courses/${ev.course_id}/assignments/${aid}/edit`;
  }
  if (role === 'faculty') {
    return `/faculty/courses/${ev.course_id}/assignments/${aid}/submissions`;
  }
  return `/admin/courses`;
}

const MAX_VISIBLE_EVENTS = 3;

export function CalendarView({ role }: Props) {
  const [month, setMonth] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selected, setSelected] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const gridStart = useMemo(
    () => startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    [month],
  );
  const gridEnd = useMemo(
    () => endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
    [month],
  );

  useEffect(() => {
    const from = format(gridStart, 'yyyy-MM-dd');
    const to = format(gridEnd, 'yyyy-MM-dd');
    setLoading(true);
    calendar
      .list(from, to)
      .then((data) => {
        setEvents(data);
        setError(null);
      })
      .catch((err: Error) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [gridStart, gridEnd]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = format(new Date(ev.due_date), 'yyyy-MM-dd');
      const bucket = map.get(key) ?? [];
      bucket.push(ev);
      map.set(key, bucket);
    }
    for (const [, list] of map) {
      list.sort(
        (a, b) =>
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
      );
    }
    return map;
  }, [events]);

  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd],
  );

  const selectedEvents = selected
    ? eventsByDay.get(format(selected, 'yyyy-MM-dd')) ?? []
    : [];

  const goPrev = () => setMonth((m) => subMonths(m, 1));
  const goNext = () => setMonth((m) => addMonths(m, 1));
  const goToday = () => {
    const now = new Date();
    setMonth(now);
    setSelected(now);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <p className="t-body text-[var(--text-secondary)]">
            Deadlines across your {role === 'admin' ? 'institution' : 'courses'}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goPrev}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </Button>
          <div className="min-w-[10rem] text-center">
            <p className="t-h3">{format(month, 'MMMM yyyy')}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={goNext}
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </Button>
          <Button variant="secondary" size="sm" onClick={goToday}>
            Today
          </Button>
          {loading && (
            <span className="t-caption text-[var(--text-muted)]">Loading…</span>
          )}
        </div>
      </header>

      {error && <p className="t-caption text-[var(--danger-fg)]">{error}</p>}

      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b-hair bg-[var(--surface-sunken)]">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-3 py-2 t-caption font-semibold uppercase tracking-wide text-[var(--text-secondary)]"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[minmax(8rem,_1fr)]">
          {days.map((day, i) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay.get(key) ?? [];
            const inMonth = isSameMonth(day, month);
            const isSelected = selected ? isSameDay(day, selected) : false;
            const today = isToday(day);
            const visible = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
            const hidden = dayEvents.length - visible.length;

            return (
              <button
                key={key + i}
                type="button"
                onClick={() => setSelected(day)}
                className={[
                  'group relative flex flex-col gap-1 p-2 text-left',
                  'border-b-hair border-r-hair focus-ora',
                  'transition-colors',
                  inMonth
                    ? 'bg-[var(--surface-raised)]'
                    : 'bg-[var(--surface-sunken)]/40 text-[var(--text-muted)]',
                  isSelected
                    ? 'outline outline-2 outline-[var(--ember)] -outline-offset-2'
                    : '',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={[
                      'inline-flex h-6 w-6 items-center justify-center rounded-full t-caption',
                      today
                        ? 'bg-[var(--ember)] font-bold text-[var(--ember-ink)]'
                        : inMonth
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-muted)]',
                    ].join(' ')}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="t-caption text-[var(--text-muted)]">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1 overflow-hidden">
                  {visible.map((ev) => (
                    <div
                      key={ev.id}
                      className={[
                        'truncate rounded-sm px-1.5 py-0.5 t-caption',
                        statusChipClass(ev.status),
                      ].join(' ')}
                      title={`${ev.title} — ${ev.course_title}`}
                    >
                      <span className="mr-1 text-[10px] font-semibold uppercase opacity-80">
                        {ev.type === 'quiz' ? 'Q' : 'A'}
                      </span>
                      {ev.title}
                    </div>
                  ))}
                  {hidden > 0 && (
                    <span className="t-caption text-[var(--text-muted)]">
                      +{hidden} more
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>{format(selected, 'EEEE, MMMM d, yyyy')}</CardTitle>
            <CardDescription>
              {selectedEvents.length === 0
                ? 'No events on this day.'
                : `${selectedEvents.length} event${selectedEvents.length === 1 ? '' : 's'}`}
            </CardDescription>
          </CardHeader>
          {selectedEvents.length > 0 && (
            <CardContent className="space-y-2">
              {selectedEvents.map((ev) => (
                <Link
                  key={ev.id}
                  href={eventHref(role, ev)}
                  className="flex items-start justify-between gap-3 rounded-md border-hair p-3 transition-colors hover:bg-[var(--surface-sunken)] focus-ora"
                >
                  <div className="min-w-0 flex-1">
                    <p className="t-body font-medium">{ev.title}</p>
                    <p className="t-caption text-[var(--text-secondary)]">
                      {ev.course_title} · {format(new Date(ev.due_date), 'p')}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge tone={ev.type === 'quiz' ? 'ember' : 'neutral'}>
                      {ev.type}
                    </Badge>
                    <Badge tone={statusToTone(ev.status)}>{ev.status}</Badge>
                  </div>
                </Link>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      <section className="flex flex-wrap gap-4 t-caption text-[var(--text-secondary)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border-l-2 border-[var(--text-muted)] bg-[var(--surface-sunken)]" />
          Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border-l-2 border-[var(--danger-fg)] bg-[var(--danger-bg)]" />
          Overdue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border-l-2 border-[var(--ember)] bg-[var(--ember)]" />
          Submitted
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border-l-2 border-[var(--success-fg)] bg-[var(--success-bg)]" />
          Graded
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-semibold">Q</span> Quiz ·{' '}
          <span className="font-semibold">A</span> Assignment
        </span>
      </section>
    </div>
  );
}
