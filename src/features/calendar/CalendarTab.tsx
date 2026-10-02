import { useState, useMemo } from 'react';
import type { CalendarEvent, EventType } from '@/db/db';
import { getAllEvents, updateEvent, deleteEvent } from '@/db/eventRepo';
import { useLiveQuery } from '@/db/useLiveQuery';
import { useToast } from '@/components/ToastContext';
import { downloadIcs } from '@/lib/calendar/icsExporter';
import { AddEventSheet } from './AddEventSheet';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  Bell,
  CalendarDays,
} from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  quiz: 'var(--color-quiz)',
  assignment: 'var(--color-assignment)',
  exam: 'var(--color-exam)',
  'class-change': 'var(--color-class-change)',
  deadline: 'var(--color-quiz)',
  other: 'var(--color-muted)',
};

function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function CalendarTab() {
  const { showToast } = useToast();
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [viewFilter, setViewFilter] = useState<'selected' | 'upcoming'>('selected');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Live queries for all events
  const events = useLiveQuery(() => getAllEvents(), []) || [];

  // Map events by date key (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = formatDateKey(new Date(e.startAt));
      const list = map.get(key) || [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [events]);

  // Calendar Grid Calculation
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Trailing days from next month to complete 6-row or 5-row grid (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setSelectedDate(now);
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const handleToggleDone = async (event: CalendarEvent) => {
    if (!event.id) return;
    const newStatus = !event.isDone;
    await updateEvent(event.id, { isDone: newStatus });
    showToast({
      message: newStatus ? `Marked "${event.title}" done` : `Marked "${event.title}" pending`,
      actionLabel: 'Undo',
      onAction: async () => {
        await updateEvent(event.id!, { isDone: !newStatus });
      },
    });
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (!event.id) return;
    const eventCopy = { ...event };
    await deleteEvent(event.id);

    showToast({
      message: `Deleted "${event.title}"`,
      actionLabel: 'Undo',
      onAction: async () => {
        const { id, ...rest } = eventCopy;
        await updateEvent(eventCopy.id!, rest);
      },
    });
  };

  const handleExportAll = () => {
    if (events.length === 0) {
      showToast({ message: 'No events to export' });
      return;
    }
    downloadIcs(events, 'WhatsAppText-All-Events.ics');
    showToast({ message: `Exported ${events.length} event(s) to .ics` });
  };

  const handleExportSingle = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    downloadIcs([event], `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`);
    showToast({ message: `Exported "${event.title}" to .ics` });
  };

  // Filtered Events for the Agenda list
  const filteredEvents = useMemo(() => {
    if (viewFilter === 'upcoming') {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return events.filter((e) => new Date(e.startAt) >= now);
    }
    const selectedKey = formatDateKey(selectedDate);
    return eventsByDate.get(selectedKey) || [];
  }, [events, viewFilter, selectedDate, eventsByDate]);

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const today = new Date();

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)] overflow-y-auto">
      {/* Calendar Card Container */}
      <div className="p-3 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0">
        {/* Month Navigation Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[var(--color-text)]">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={handleToday}
              className="text-[11px] font-semibold text-[var(--color-accent)] px-2 py-0.5 rounded-full border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/15 transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors cursor-pointer"
              style={{ minHeight: '36px', minWidth: '36px' }}
              aria-label="Previous Month"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors cursor-pointer"
              style={{ minHeight: '36px', minWidth: '36px' }}
              aria-label="Next Month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 text-center mb-1">
          {WEEKDAYS.map((day) => (
            <span
              key={day}
              className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider py-1"
            >
              {day}
            </span>
          ))}
        </div>

        {/* Month Day Grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {calendarDays.map(({ date, isCurrentMonth }, idx) => {
            const dateKey = formatDateKey(date);
            const dayEvents = eventsByDate.get(dateKey) || [];
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, today);

            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedDate(date);
                  if (!isCurrentMonth) {
                    setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                  }
                }}
                className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all relative cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--color-accent)] text-black font-bold shadow-xs'
                    : isToday
                    ? 'border border-[var(--color-accent)] text-[var(--color-accent)] font-semibold'
                    : isCurrentMonth
                    ? 'text-[var(--color-text)] hover:bg-[var(--color-elevated)]'
                    : 'text-[var(--color-muted)]/40 hover:bg-[var(--color-elevated)]'
                }`}
                style={{ minHeight: '42px' }}
              >
                <span className="text-xs">{date.getDate()}</span>

                {/* Event Dots */}
                <div className="flex items-center gap-0.5 h-1.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((ev, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: isSelected
                          ? '#000000'
                          : EVENT_TYPE_COLORS[ev.type] || 'var(--color-muted)',
                      }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Agenda Header & Action Controls */}
      <div className="px-4 py-3 bg-[var(--color-bg)] border-b border-[var(--color-border)] flex items-center justify-between gap-2">
        {/* Toggle between Selected Day vs Upcoming */}
        <div className="flex items-center gap-1 bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-border)]">
          <button
            onClick={() => setViewFilter('selected')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              viewFilter === 'selected'
                ? 'bg-[var(--color-elevated)] text-[var(--color-text)] shadow-xs'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {isSameDay(selectedDate, today)
              ? 'Today'
              : selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </button>
          <button
            onClick={() => setViewFilter('upcoming')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              viewFilter === 'upcoming'
                ? 'bg-[var(--color-elevated)] text-[var(--color-text)] shadow-xs'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            All Upcoming
          </button>
        </div>

        {/* Global Export .ics & Add Event buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExportAll}
            title="Export all events to .ics"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] text-xs font-semibold text-[var(--color-text)] transition-colors cursor-pointer"
            style={{ minHeight: '36px' }}
          >
            <Download size={14} className="text-[var(--color-accent)]" />
            <span>.ics</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            title="Add event"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--color-accent)] text-black font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer"
            style={{ minHeight: '36px' }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Agenda Event List */}
      <div className="flex-1 p-3 flex flex-col gap-2.5">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center my-auto">
            <div className="w-12 h-12 rounded-full bg-[var(--color-elevated)] flex items-center justify-center text-[var(--color-muted)] mb-3">
              <CalendarDays size={24} />
            </div>
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {viewFilter === 'selected'
                ? `No events on ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'No upcoming events'}
            </p>
            <p className="text-xs text-[var(--color-muted)] mt-1 max-w-xs">
              Swipe right on any WhatsApp message or tap "+ Add" above to schedule an event.
            </p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const eventDate = new Date(event.startAt);
            const timeFormatted = event.allDay
              ? 'All Day'
              : eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const typeColor = EVENT_TYPE_COLORS[event.type] || 'var(--color-muted)';

            return (
              <div
                key={event.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col gap-2 ${
                  event.isDone
                    ? 'bg-[var(--color-surface)]/60 border-[var(--color-border)] opacity-60'
                    : 'bg-[var(--color-elevated)] border-[var(--color-border)] hover:border-[var(--color-border)]/80 shadow-xs'
                }`}
              >
                {/* Header Row: Checkbox, Title & Actions */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button
                      onClick={() => handleToggleDone(event)}
                      className="mt-0.5 text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer shrink-0"
                      aria-label={event.isDone ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {event.isDone ? (
                        <CheckCircle2 size={18} className="text-[var(--color-accent)]" />
                      ) : (
                        <Circle size={18} />
                      )}
                    </button>

                    <div className="flex flex-col min-w-0">
                      <h4
                        className={`text-sm font-semibold truncate ${
                          event.isDone
                            ? 'line-through text-[var(--color-muted)]'
                            : 'text-[var(--color-text)]'
                        }`}
                      >
                        {event.title}
                      </h4>

                      {/* Date & Time */}
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--color-muted)]">
                        <span className="flex items-center gap-1 font-medium">
                          <CalendarIcon size={12} />
                          {eventDate.toLocaleDateString('en-GB', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {timeFormatted}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Export & Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => handleExportSingle(e, event)}
                      title="Export this event to .ics"
                      className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
                      style={{ minHeight: '32px', minWidth: '32px' }}
                      aria-label="Export to .ics"
                    >
                      <Download size={14} />
                    </button>

                    <button
                      onClick={() => handleDeleteEvent(event)}
                      title="Delete event"
                      className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-quiz)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
                      style={{ minHeight: '32px', minWidth: '32px' }}
                      aria-label="Delete event"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Footer Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--color-border)]/50">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                    style={{
                      backgroundColor: `${typeColor}20`,
                      color: typeColor,
                      borderColor: `${typeColor}40`,
                    }}
                  >
                    {event.type}
                  </span>

                  {event.subject && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)]">
                      {event.subject}
                    </span>
                  )}

                  {!event.timeConfirmed && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--color-exam)]/15 text-[var(--color-exam)] border border-[var(--color-exam)]/30">
                      Time unconfirmed
                    </span>
                  )}

                  {event.reminderOffsets && event.reminderOffsets.length > 0 && (
                    <span className="flex items-center gap-1 ml-auto text-[10px] text-[var(--color-muted)]">
                      <Bell size={11} className="text-[var(--color-exam)]" />
                      <span>{event.reminderOffsets.length} reminder(s)</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Event Sheet */}
      <AddEventSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        defaultDate={selectedDate}
      />
    </div>
  );
}
