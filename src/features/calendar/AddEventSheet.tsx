import { useState } from 'react';
import { BottomSheet } from '@/components/BottomSheet';
import type { EventType } from '@/db/db';
import { createEvent } from '@/db/eventRepo';
import { createReminder } from '@/db/reminderRepo';
import { useToast } from '@/components/ToastContext';
import { Plus } from 'lucide-react';

interface AddEventSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: Date;
  onEventCreated?: (eventId: number) => void;
}

const EVENT_TYPES: { type: EventType; label: string }[] = [
  { type: 'quiz', label: 'Quiz' },
  { type: 'assignment', label: 'Assignment' },
  { type: 'exam', label: 'Exam' },
  { type: 'class-change', label: 'Class Change' },
  { type: 'other', label: 'Other' },
];

export function AddEventSheet({
  isOpen,
  onClose,
  defaultDate,
  onEventCreated,
}: AddEventSheetProps) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [type, setType] = useState<EventType>('quiz');
  const [dateStr, setDateStr] = useState(() => {
    const d = defaultDate || new Date();
    return d.toISOString().split('T')[0];
  });
  const [timeStr, setTimeStr] = useState('09:00');
  const [allDay, setAllDay] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dateStr) return;

    try {
      setIsSubmitting(true);
      let startAt: Date;
      if (allDay) {
        startAt = new Date(`${dateStr}T09:00:00`);
      } else {
        startAt = new Date(`${dateStr}T${timeStr || '09:00'}:00`);
      }

      const reminderOffsets = ['quiz', 'exam', 'deadline', 'assignment'].includes(type)
        ? [1440, 60]
        : [60];

      const eventId = await createEvent({
        title: title.trim(),
        subject: subject.trim() || undefined,
        type,
        startAt,
        allDay,
        timeConfirmed: !allDay,
        isDone: false,
        reminderOffsets,
      });

      // Automatically create reminders
      for (const offset of reminderOffsets) {
        const trigger = new Date(startAt.getTime() - offset * 60 * 1000);
        if (trigger > new Date()) {
          await createReminder({
            eventId,
            title: `Reminder: ${title.trim()}`,
            triggerAt: trigger,
            status: 'pending',
          });
        }
      }

      showToast({
        message: `Created event "${title}"`,
      });

      setTitle('');
      setSubject('');
      onClose();
      onEventCreated?.(eventId);
    } catch (err) {
      console.error(err);
      showToast({ message: 'Failed to create event' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="New calendar event">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 py-1">
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
            Event title
          </label>
          <input
            type="text"
            required
            placeholder="e.g. DBMS Quiz Unit 3"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 h-[44px] rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[14px] font-normal text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>

        {/* Subject & Type row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
              Subject
            </label>
            <input
              type="text"
              placeholder="e.g. DBMS, OS"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 h-[44px] rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[14px] font-normal text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
              Category
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EventType)}
              className="w-full px-3.5 h-[44px] rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[13px] font-semibold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer transition-colors"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.type} value={t.type} className="bg-[var(--color-surface)] text-[var(--color-text)]">
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
              Date
            </label>
            <input
              type="date"
              required
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full px-3.5 h-[44px] rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[13px] font-semibold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
              Time
            </label>
            <input
              type="time"
              disabled={allDay}
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="w-full px-3.5 h-[44px] rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[13px] font-semibold text-[var(--color-text)] disabled:opacity-40 focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>
        </div>

        {/* All Day Switch */}
        <label className="flex items-center gap-2.5 cursor-pointer py-1 select-none">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-accent)] accent-[var(--color-accent)] cursor-pointer"
          />
          <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">
            All-day / Time unconfirmed
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className="btn-primary w-full h-[44px] text-[14px] font-bold flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>{isSubmitting ? 'Saving...' : 'Add event to calendar'}</span>
        </button>
      </form>
    </BottomSheet>
  );
}
