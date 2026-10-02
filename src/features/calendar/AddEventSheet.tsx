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

const EVENT_TYPES: { type: EventType; label: string; color: string }[] = [
  { type: 'quiz', label: 'Quiz', color: 'var(--color-quiz)' },
  { type: 'assignment', label: 'Assignment', color: 'var(--color-assignment)' },
  { type: 'exam', label: 'Exam', color: 'var(--color-exam)' },
  { type: 'class-change', label: 'Class Change', color: 'var(--color-class-change)' },
  { type: 'other', label: 'Other', color: 'var(--color-muted)' },
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
    <BottomSheet isOpen={isOpen} onClose={onClose} title="New Calendar Event">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
            Event Title
          </label>
          <input
            type="text"
            required
            placeholder="e.g. DBMS Quiz Unit 3"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
            style={{ minHeight: '44px' }}
          />
        </div>

        {/* Subject & Type row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
              Subject
            </label>
            <input
              type="text"
              placeholder="e.g. DBMS, OS"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              style={{ minHeight: '44px' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
              Category
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EventType)}
              className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              style={{ minHeight: '44px' }}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
              Date
            </label>
            <input
              type="date"
              required
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              style={{ minHeight: '44px' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
              Time
            </label>
            <input
              type="time"
              disabled={allDay}
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] text-sm text-[var(--color-text)] disabled:opacity-40 focus:outline-none focus:border-[var(--color-accent)]"
              style={{ minHeight: '44px' }}
            />
          </div>
        </div>

        {/* All Day Switch */}
        <label className="flex items-center gap-2.5 cursor-pointer py-1">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="w-4 h-4 rounded text-[var(--color-accent)] focus:ring-0 cursor-pointer"
          />
          <span className="text-xs font-medium text-[var(--color-text)]">
            All-day / Time Unconfirmed
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-black font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          style={{ minHeight: '44px' }}
        >
          <Plus size={18} strokeWidth={2.5} />
          {isSubmitting ? 'Saving...' : 'Add Event to Calendar'}
        </button>
      </form>
    </BottomSheet>
  );
}
