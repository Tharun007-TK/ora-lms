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
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

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
  calendarEvents,
  type CalendarCustomEvent,
  type CalendarEvent,
  type CalendarEventStatus,
  type UserRole,
} from '@/lib/api';

interface Props {
  role: UserRole;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const REMINDER_OPTIONS = [
  { label: 'No reminder', value: '' },
  { label: '15 min before', value: '15' },
  { label: '30 min before', value: '30' },
  { label: '1 hour before', value: '60' },
  { label: '1 day before', value: '1440' },
];

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

interface AddEventForm {
  title: string;
  date: string;
  time: string;
  description: string;
  reminder: string;
}

function emptyForm(defaultDate?: Date): AddEventForm {
  return {
    title: '',
    date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    description: '',
    reminder: '',
  };
}

export function CalendarView({ role }: Props) {
  const [month, setMonth] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [customEvts, setCustomEvts] = useState<CalendarCustomEvent[]>([]);
  const [selected, setSelected] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AddEventForm>(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const gridStart = useMemo(
    () => startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    [month],
  );
  const gridEnd = useMemo(
    () => endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
    [month],
  );

  const from = useMemo(() => format(gridStart, 'yyyy-MM-dd'), [gridStart]);
  const to = useMemo(() => format(gridEnd, 'yyyy-MM-dd'), [gridEnd]);

  useEffect(() => {
    setLoading(true);
    const sysReq = calendar.list(from, to);
    const customReq =
      role !== 'admin' ? calendarEvents.list(from, to) : Promise.resolve<CalendarCustomEvent[]>([]);
    Promise.all([sysReq, customReq])
      .then(([sys, custom]) => {
        setEvents(sys);
        setCustomEvts(custom);
        setError(null);
      })
      .catch((err: Error) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [from, to, role]);

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

  const customByDay = useMemo(() => {
    const map = new Map<string, CalendarCustomEvent[]>();
    for (const ev of customEvts) {
      const key = format(new Date(ev.event_date), 'yyyy-MM-dd');
      const bucket = map.get(key) ?? [];
      bucket.push(ev);
      map.set(key, bucket);
    }
    return map;
  }, [customEvts]);

  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd],
  );

  const selectedEvents = selected
    ? eventsByDay.get(format(selected, 'yyyy-MM-dd')) ?? []
    : [];
  const selectedCustom = selected
    ? customByDay.get(format(selected, 'yyyy-MM-dd')) ?? []
    : [];

  const goPrev = () => setMonth((m) => subMonths(m, 1));
  const goNext = () => setMonth((m) => addMonths(m, 1));
  const goToday = () => {
    const now = new Date();
    setMonth(now);
    setSelected(now);
  };

  const openModal = (day?: Date) => {
    setForm(emptyForm(day ?? selected ?? undefined));
    setFormError(null);
    setShowModal(true);
    setTimeout(() => titleRef.current?.focus(), 50);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setFormError('Title is required');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const event_date = new Date(`${form.date}T${form.time}:00`).toISOString();
      const reminder_minutes = form.reminder ? parseInt(form.reminder, 10) : null;
      const created = await calendarEvents.create({
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_date,
        reminder_minutes,
      });
      setCustomEvts((prev) => [...prev, created]);
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await calendarEvents.remove(id);
      setCustomEvts((prev) => prev.filter((e) => e.id !== id));
    } catch {
      // no-op — let the user retry
    }
  };

  const totalSelected = selectedEvents.length + selectedCustom.length;

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
          {role !== 'admin' && (
            <Button size="sm" onClick={() => openModal()}>
              <Plus size={14} className="mr-1" />
              Add Event
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={goPrev} aria-label="Previous month">
            <ChevronLeft size={16} />
          </Button>
          <div className="min-w-[10rem] text-center">
            <p className="t-h3">{format(month, 'MMMM yyyy')}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={goNext} aria-label="Next month">
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
            const dayCustom = customByDay.get(key) ?? [];
            const totalCount = dayEvents.length + dayCustom.length;
            const inMonth = isSameMonth(day, month);
            const isSelected = selected ? isSameDay(day, selected) : false;
            const today = isToday(day);

            const visibleSys = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
            const remaining = Math.max(0, MAX_VISIBLE_EVENTS - visibleSys.length);
            const visibleCustom = dayCustom.slice(0, remaining);
            const hidden = totalCount - visibleSys.length - visibleCustom.length;

            return (
              <button
                key={key + i}
                type="button"
                onClick={() => setSelected(day)}
                className={[
                  'group relative flex flex-col gap-1 p-2 text-left',
                  'border-b-hair border-r-hair focus-ora transition-colors',
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
                  {totalCount > 0 && (
                    <span className="t-caption text-[var(--text-muted)]">{totalCount}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1 overflow-hidden">
                  {visibleSys.map((ev) => (
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
                  {visibleCustom.map((ev) => (
                    <div
                      key={`c${ev.id}`}
                      className="truncate rounded-sm px-1.5 py-0.5 t-caption bg-[var(--surface-sunken)] text-[var(--text-primary)] border-l-2 border-[var(--ember)]"
                      title={ev.title}
                    >
                      <span className="mr-1 text-[10px] font-semibold uppercase opacity-80">E</span>
                      {ev.title}
                    </div>
                  ))}
                  {hidden > 0 && (
                    <span className="t-caption text-[var(--text-muted)]">+{hidden} more</span>
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{format(selected, 'EEEE, MMMM d, yyyy')}</CardTitle>
                <CardDescription>
                  {totalSelected === 0
                    ? 'No events on this day.'
                    : `${totalSelected} event${totalSelected === 1 ? '' : 's'}`}
                </CardDescription>
              </div>
              {role !== 'admin' && (
                <Button size="sm" variant="secondary" onClick={() => openModal(selected)}>
                  <Plus size={14} className="mr-1" />
                  Add
                </Button>
              )}
            </div>
          </CardHeader>
          {totalSelected > 0 && (
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
                    <Badge tone={ev.type === 'quiz' ? 'ember' : 'neutral'}>{ev.type}</Badge>
                    <Badge tone={statusToTone(ev.status)}>{ev.status}</Badge>
                  </div>
                </Link>
              ))}
              {selectedCustom.map((ev) => {
                const reminderLabel =
                  ev.reminder_minutes === null
                    ? null
                    : ev.reminder_minutes >= 60
                    ? `${ev.reminder_minutes / 60}h before`
                    : `${ev.reminder_minutes}m before`;
                return (
                  <div
                    key={`c${ev.id}`}
                    className="flex items-start justify-between gap-3 rounded-md border-hair p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="t-body font-medium">{ev.title}</p>
                      <p className="t-caption text-[var(--text-secondary)]">
                        {format(new Date(ev.event_date), 'p')}
                        {reminderLabel ? ` · reminder ${reminderLabel}` : ''}
                      </p>
                      {ev.description && (
                        <p className="mt-0.5 t-caption text-[var(--text-muted)]">
                          {ev.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-start gap-2">
                      <Badge tone="neutral">Event</Badge>
                      <button
                        type="button"
                        onClick={() => handleDelete(ev.id)}
                        className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-fg)] transition-colors"
                        aria-label="Delete event"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
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
          <span className="inline-block h-3 w-3 rounded-sm border-l-2 border-[var(--ember)] bg-[var(--surface-sunken)]" />
          Custom event
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-semibold">Q</span> Quiz ·{' '}
          <span className="font-semibold">A</span> Assignment ·{' '}
          <span className="font-semibold">E</span> Event
        </span>
      </section>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-xl border-hair bg-[var(--surface-raised)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-hair px-5 py-4">
              <h2 className="t-h3">Add Event</h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <label className="t-caption font-medium text-[var(--text-secondary)]">
                  Title <span className="text-[var(--danger-fg)]">*</span>
                </label>
                <input
                  ref={titleRef}
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  maxLength={200}
                  placeholder="Event title"
                  className="mt-1 w-full rounded-md border-hair bg-[var(--surface-base)] px-3 py-2 t-body text-[var(--ink)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ember)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="t-caption font-medium text-[var(--text-secondary)]">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="mt-1 w-full rounded-md border-hair bg-[var(--surface-base)] px-3 py-2 t-body text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--ember)]"
                  />
                </div>
                <div>
                  <label className="t-caption font-medium text-[var(--text-secondary)]">Time</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                    className="mt-1 w-full rounded-md border-hair bg-[var(--surface-base)] px-3 py-2 t-body text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--ember)]"
                  />
                </div>
              </div>

              <div>
                <label className="t-caption font-medium text-[var(--text-secondary)]">
                  Description{' '}
                  <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Notes about this event…"
                  className="mt-1 w-full resize-none rounded-md border-hair bg-[var(--surface-base)] px-3 py-2 t-body text-[var(--ink)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ember)]"
                />
              </div>

              <div>
                <label className="t-caption font-medium text-[var(--text-secondary)]">
                  Reminder
                </label>
                <select
                  value={form.reminder}
                  onChange={(e) => setForm((f) => ({ ...f, reminder: e.target.value }))}
                  className="mt-1 w-full rounded-md border-hair bg-[var(--surface-base)] px-3 py-2 t-body text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--ember)]"
                >
                  {REMINDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {formError && (
                <p className="t-caption text-[var(--danger-fg)]">{formError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t-hair px-5 py-4">
              <Button variant="ghost" size="sm" onClick={closeModal} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save event'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
