import { useMemo } from 'react';
import type { SchoolEvent } from '../../types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TYPE_COLORS: Record<string, string> = {
  Academic: '#2563eb',
  Examination: '#dc2626',
  Clinical: '#059669',
  Finance: '#d97706',
  Social: '#7c3aed',
  Administrative: '#64748b',
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function eventOnDay(event: SchoolEvent, day: Date) {
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
  return start <= dayEnd && end >= dayStart;
}

interface SchoolCalendarProps {
  events: SchoolEvent[];
  month: Date;
  loading?: boolean;
  onMonthChange: (month: Date) => void;
  onDayClick?: (day: Date) => void;
  onEventClick?: (event: SchoolEvent) => void;
}

export function SchoolCalendar({
  events,
  month,
  loading,
  onMonthChange,
  onDayClick,
  onEventClick,
}: SchoolCalendarProps) {
  const today = new Date();

  const { weeks, monthLabel } = useMemo(() => {
    const first = startOfMonth(month);
    const gridStart = addDays(first, -first.getDay());
    const cells: Date[] = [];
    for (let i = 0; i < 42; i += 1) cells.push(addDays(gridStart, i));
    const w: Date[][] = [];
    for (let i = 0; i < 6; i += 1) w.push(cells.slice(i * 7, i * 7 + 7));
    const label = month.toLocaleDateString('en-UG', { month: 'long', year: 'numeric' });
    return { weeks: w, monthLabel: label };
  }, [month]);

  const shiftMonth = (delta: number) => {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  };

  return (
    <div className="school-calendar">
      <div className="school-calendar-toolbar">
        <div className="school-calendar-nav">
          <button type="button" className="cal-nav-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            ‹
          </button>
          <button type="button" className="cal-nav-btn cal-today-btn" onClick={() => onMonthChange(startOfMonth(today))}>
            Today
          </button>
          <button type="button" className="cal-nav-btn" onClick={() => shiftMonth(1)} aria-label="Next month">
            ›
          </button>
        </div>
        <h3 className="school-calendar-title">{monthLabel}</h3>
        {loading && <span className="text-muted school-calendar-loading">Loading…</span>}
      </div>

      <div className="school-calendar-grid">
        {WEEKDAYS.map((d) => (
          <div key={d} className="school-calendar-weekday">
            {d}
          </div>
        ))}
        {weeks.flat().map((day) => {
          const inMonth = day.getMonth() === month.getMonth();
          const dayEvents = events.filter((e) => eventOnDay(e, day));
          const isToday = sameDay(day, today);

          return (
            <button
              key={day.toISOString()}
              type="button"
              className={`school-calendar-day${inMonth ? '' : ' is-outside'}${isToday ? ' is-today' : ''}`}
              onClick={() => onDayClick?.(day)}
            >
              <span className="school-calendar-day-num">{day.getDate()}</span>
              <div className="school-calendar-day-events">
                {dayEvents.slice(0, 3).map((ev) => (
                  <span
                    key={ev.id}
                    className="school-calendar-event"
                    style={{ backgroundColor: TYPE_COLORS[ev.eventType] ?? '#065a4e' }}
                    title={ev.title}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(ev);
                    }}
                  >
                    {ev.title}
                  </span>
                ))}
                {dayEvents.length > 3 && (
                  <span className="school-calendar-more">+{dayEvents.length - 3} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="school-calendar-legend">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <span key={type} className="school-calendar-legend-item">
            <span className="school-calendar-legend-dot" style={{ backgroundColor: color }} />
            {type}
          </span>
        ))}
      </div>
    </div>
  );
}

export function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function toDatetimeLocalValue(date: Date, hour = 9) {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
