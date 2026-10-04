import { useState, useMemo } from 'react';
import type { CalendarEvent, EventType } from '@/db/db';
import { getAllEvents, updateEvent, deleteEvent } from '@/db/eventRepo';
import { useLiveQuery } from '@/db/useLiveQuery';
import { useToast } from '@/components/ToastContext';
import { downloadIcs } from '@/lib/calendar/icsExporter';
import { AddEventSheet } from './AddEventSheet';
import { Chip } from '@/components/Chip';
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
  Sparkles,
} from 'lucide-react';
import { PlanReviewSheet } from '@/features/plan/PlanReviewSheet';
import { greedyPlan } from '@/lib/planner/greedyPlan';
import { validatePlan } from '@/lib/planner/validatePlan';
import type { Plan, PlanViolation, PlanRequest, PlanTopic } from '@/lib/planner/types';
import { DEFAULT_STUDY_PREFERENCES } from '@/lib/planner/types';
import { getAllClassSlots } from '@/db/classSlotRepo';
import { getAllNotes } from '@/db/noteRepo';
import { getSettings } from '@/lib/settings/settingsManager';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_DOT_COLORS: Record<EventType, string> = {
  quiz: 'var(--color-quiz)',
  assignment: 'var(--color-assignment)',
  exam: 'var(--color-exam)',
  'class-change': 'var(--color-class-change)',
  deadline: 'var(--color-quiz)',
  study: 'var(--color-accent)',
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
  const [viewFilter, setViewFilter] = useState<'selected' | 'upcoming'>('upcoming');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPlanReviewOpen, setIsPlanReviewOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Plan>({ blocks: [] });
  const [currentViolations, setCurrentViolations] = useState<PlanViolation[]>([]);

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

    // Trailing days from next month to complete rows
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

  const mapEventTypeToChip = (type: EventType): 'quiz' | 'assignment' | 'exam' | 'class-change' | 'study' | 'other' => {
    if (type === 'quiz' || type === 'deadline') return 'quiz';
    if (type === 'assignment') return 'assignment';
    if (type === 'exam') return 'exam';
    if (type === 'class-change') return 'class-change';
    if (type === 'study') return 'study';
    return 'other';
  };

  const handlePlanWeek = async () => {
    const allEvents = await getAllEvents();
    const allClasses = await getAllClassSlots();
    const allNotes = await getAllNotes();
    const prefs = getSettings().studyPreferences || DEFAULT_STUDY_PREFERENCES;

    const topics: PlanTopic[] = [];
    for (const n of allNotes) {
      if (n.linkedEventId && n.checklist) {
        for (const item of n.checklist) {
          topics.push({
            eventId: n.linkedEventId,
            text: item.text,
            isDone: item.done,
          });
        }
      }
    }

    const req: PlanRequest = {
      now: new Date().toISOString(),
      horizonDays: 7,
      events: allEvents.map((e) => ({
        id: e.id!,
        kind: (e.type === 'deadline' ? 'assignment' : e.type) as 'quiz' | 'assignment' | 'exam' | 'class-change' | 'study' | 'other',
        subject: e.subject,
        title: e.title,
        startAt: new Date(e.startAt).toISOString(),
        endAt: e.endAt ? new Date(e.endAt).toISOString() : undefined,
      })),
      classes: allClasses.map((c) => ({
        id: c.id,
        weekday: c.weekday,
        startMinute: c.startMinute,
        endMinute: c.endMinute,
        subject: c.subject,
      })),
      topics,
      prefs,
    };

    const generated = greedyPlan(req);
    const violations = validatePlan(req, generated);

    setCurrentPlan(generated);
    setCurrentViolations(violations);
    setIsPlanReviewOpen(true);
  };

  const today = new Date();

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)] overflow-y-auto">
      {/* Calendar Card Container */}
      <div className="px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0">
        {/* Month Navigation Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-[var(--color-text)]">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={handleToday}
              className="text-[11px] font-semibold text-[#0B141A] bg-[var(--color-accent)] px-2.5 py-0.5 rounded-full hover:bg-[var(--color-accent-hover)] transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-lg bg-[var(--color-elevated)] border border-[var(--color-border)] hover:border-[var(--color-accent)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer flex items-center justify-center"
              aria-label="Previous Month"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <button
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-lg bg-[var(--color-elevated)] border border-[var(--color-border)] hover:border-[var(--color-accent)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer flex items-center justify-center"
              aria-label="Next Month"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 text-center mb-1">
          {WEEKDAYS.map((day) => (
            <span
              key={day}
              className="text-[11px] font-semibold text-[var(--color-muted)] uppercase py-1"
            >
              {day}
            </span>
          ))}
        </div>

        {/* Month Day Grid */}
        <div className="grid grid-cols-7 gap-1">
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
                  setViewFilter('selected');
                  if (!isCurrentMonth) {
                    setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                  }
                }}
                className={`flex flex-col items-center justify-center p-1 rounded-xl transition-colors relative cursor-pointer border ${
                  isSelected
                    ? 'bg-[var(--color-accent)] text-[#0B141A] border-transparent font-semibold shadow-xs'
                    : isToday
                    ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-semibold bg-[var(--color-accent-surface)]'
                    : isCurrentMonth
                    ? 'border-transparent text-[var(--color-text)] hover:border-[var(--color-border)] hover:bg-[var(--color-elevated)]'
                    : 'border-transparent text-[var(--color-muted)]/50 hover:bg-[var(--color-elevated)]'
                }`}
                style={{ minHeight: '40px' }}
              >
                <span className="text-[13px]">{date.getDate()}</span>

                {/* Event Dots */}
                <div className="flex items-center gap-0.5 h-1 mt-0.5">
                  {dayEvents.slice(0, 3).map((ev, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: isSelected
                          ? '#0B141A'
                          : EVENT_DOT_COLORS[ev.type] || 'var(--color-accent)',
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
      <div className="px-4 py-2.5 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between gap-2">
        {/* Toggle between Selected Day vs Upcoming */}
        <div className="flex items-center gap-1 bg-[var(--color-elevated)] p-1 rounded-full border border-[var(--color-border)]">
          <button
            onClick={() => setViewFilter('selected')}
            className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-colors cursor-pointer ${
              viewFilter === 'selected'
                ? 'bg-[var(--color-accent)] text-[#0B141A] shadow-xs'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {isSameDay(selectedDate, today)
              ? 'Today'
              : selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </button>
          <button
            onClick={() => setViewFilter('upcoming')}
            className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-colors cursor-pointer ${
              viewFilter === 'upcoming'
                ? 'bg-[var(--color-accent)] text-[#0B141A] shadow-xs'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            All Upcoming
          </button>
        </div>

        {/* Global Export .ics, Plan Week & Add Event buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePlanWeek}
            title="Plan study sessions for the week"
            className="flex items-center gap-1 px-2.5 h-[36px] rounded-[var(--radius-button)] border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20 text-[12px] font-semibold text-[var(--color-accent)] transition-colors cursor-pointer shadow-xs"
          >
            <Sparkles size={14} strokeWidth={2} />
            <span>Plan week</span>
          </button>

          <button
            onClick={handleExportAll}
            title="Export all events to .ics"
            className="flex items-center gap-1 px-2.5 h-[36px] rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-elevated)] text-[12px] font-semibold text-[var(--color-text)] transition-colors cursor-pointer shadow-xs"
          >
            <Download size={14} strokeWidth={2} className="text-[var(--color-accent)]" />
            <span>.ICS</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            title="Add event"
            className="btn-primary h-[36px] px-3 text-[12px] font-bold"
          >
            <Plus size={16} strokeWidth={2} />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Agenda Event List */}
      <div className="flex-1 px-4 py-3 flex flex-col gap-2.5">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center my-auto gap-4">
            <p className="text-[13px] font-normal text-[var(--color-muted)]">
              {viewFilter === 'selected'
                ? `No events on ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'No upcoming events'}
            </p>
            <button
              onClick={() => setIsAddOpen(true)}
              className="btn-primary"
            >
              <Plus size={18} strokeWidth={2} />
              <span>Add event</span>
            </button>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const eventDate = new Date(event.startAt);
            const timeFormatted = event.allDay
              ? 'All Day'
              : eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={event.id}
                data-card="true"
                className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)] p-3.5 flex flex-col gap-2.5 transition-colors shadow-xs ${
                  event.isDone
                    ? 'opacity-60'
                    : 'hover:border-[var(--color-accent)]/40'
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
                        <CheckCircle2 size={18} className="text-[var(--color-accent)]" strokeWidth={2} />
                      ) : (
                        <Circle size={18} strokeWidth={1.75} />
                      )}
                    </button>

                    <div className="flex flex-col min-w-0">
                      <h4
                        className={`text-[14px] font-semibold truncate ${
                          event.isDone
                            ? 'line-through text-[var(--color-muted)]'
                            : 'text-[var(--color-text)]'
                        }`}
                      >
                        {event.title}
                      </h4>

                      {/* Date & Time */}
                      <div className="flex items-center gap-2 mt-1 text-[12px] font-normal text-[var(--color-muted)]">
                        <span className="flex items-center gap-1">
                          <CalendarIcon size={12} strokeWidth={1.75} />
                          {eventDate.toLocaleDateString('en-GB', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} strokeWidth={1.75} />
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
                      className="w-8 h-8 rounded-lg bg-[var(--color-elevated)] border border-[var(--color-border)] hover:border-[var(--color-accent)] text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer flex items-center justify-center shadow-xs"
                      aria-label="Export to .ics"
                    >
                      <Download size={14} strokeWidth={1.75} />
                    </button>

                    <button
                      onClick={() => handleDeleteEvent(event)}
                      title="Delete event"
                      className="w-8 h-8 rounded-lg bg-[var(--color-elevated)] border border-[var(--color-border)] hover:border-[var(--color-danger)] text-[var(--color-muted)] hover:text-[var(--color-danger)] transition-colors cursor-pointer flex items-center justify-center shadow-xs"
                      aria-label="Delete event"
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>

                {/* Footer Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--color-border)]/50">
                  <Chip
                    label={event.type}
                    type={mapEventTypeToChip(event.type)}
                  />

                  {event.subject && (
                    <Chip
                      label={event.subject}
                      type="neutral"
                    />
                  )}

                  {!event.timeConfirmed && (
                    <Chip
                      label="Time Unconfirmed"
                      type="exam"
                    />
                  )}

                  {event.reminderOffsets && event.reminderOffsets.length > 0 && (
                    <span className="flex items-center gap-1 ml-auto text-[11px] font-normal text-[var(--color-muted)]">
                      <Bell size={12} className="text-[var(--color-quiz)]" strokeWidth={1.75} />
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

      {/* Plan Review Sheet */}
      <PlanReviewSheet
        isOpen={isPlanReviewOpen}
        onClose={() => setIsPlanReviewOpen(false)}
        plan={currentPlan}
        violations={currentViolations}
        source="greedy"
        onReplan={handlePlanWeek}
      />
    </div>
  );
}
