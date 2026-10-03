import { useState } from 'react';
import { BottomSheet } from '@/components/BottomSheet';
import { Bell, Sparkles } from 'lucide-react';
import { createReminder } from '@/db/reminderRepo';
import { scheduleNativeReminder } from '@/lib/remind/nativeNotifications';
import { useToast } from '@/components/ToastContext';

interface AddReminderSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTitle?: string;
  defaultEventId?: number;
  defaultMessageId?: number;
}

export function AddReminderSheet({
  isOpen,
  onClose,
  defaultTitle = '',
  defaultEventId,
  defaultMessageId,
}: AddReminderSheetProps) {
  const { showToast } = useToast();
  const [title, setTitle] = useState(defaultTitle);
  const [dateStr, setDateStr] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    return localIso;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyPreset = (minutesFromNow: number, setSpecificTime?: { hour: number; minute: number; addDays?: number }) => {
    const target = new Date();
    if (setSpecificTime) {
      if (setSpecificTime.addDays) {
        target.setDate(target.getDate() + setSpecificTime.addDays);
      }
      target.setHours(setSpecificTime.hour, setSpecificTime.minute, 0, 0);
      if (target.getTime() <= Date.now() && !setSpecificTime.addDays) {
        target.setDate(target.getDate() + 1);
      }
    } else {
      target.setMinutes(target.getMinutes() + minutesFromNow);
    }

    const localIso = new Date(target.getTime() - target.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setDateStr(localIso);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dateStr) return;

    try {
      setIsSubmitting(true);
      const triggerAt = new Date(dateStr);

      const reminderId = await createReminder({
        title: title.trim(),
        triggerAt,
        status: 'pending',
        eventId: defaultEventId,
        messageId: defaultMessageId,
      });

      await scheduleNativeReminder({
        id: reminderId,
        title: title.trim(),
        triggerAt,
        status: 'pending',
        eventId: defaultEventId,
        messageId: defaultMessageId,
        createdAt: new Date(),
      });

      showToast({ message: `Reminder set for ${triggerAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` });
      onClose();
    } catch (err) {
      console.error('Failed to create reminder:', err);
      showToast({ message: 'Failed to set reminder' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Set a reminder">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 py-1">
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
            Reminder title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Submit DBMS Assignment 2"
            className="w-full px-3.5 h-[44px] rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-elevated)] text-[14px] font-normal text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            autoFocus
            required
          />
        </div>

        {/* Quick Presets */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)] flex items-center gap-1.5">
            <Sparkles size={13} className="text-[var(--color-accent)]" />
            <span>Quick presets</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => applyPreset(15)}
              className="btn-secondary h-[40px] text-[12px] font-semibold cursor-pointer"
            >
              In 15 mins
            </button>
            <button
              type="button"
              onClick={() => applyPreset(60)}
              className="btn-secondary h-[40px] text-[12px] font-semibold cursor-pointer"
            >
              In 1 hour
            </button>
            <button
              type="button"
              onClick={() => applyPreset(0, { hour: 20, minute: 0 })}
              className="btn-secondary h-[40px] text-[12px] font-semibold cursor-pointer"
            >
              Tonight 8 PM
            </button>
            <button
              type="button"
              onClick={() => applyPreset(0, { hour: 9, minute: 0, addDays: 1 })}
              className="btn-secondary h-[40px] text-[12px] font-semibold cursor-pointer"
            >
              Tomorrow 9 AM
            </button>
          </div>
        </div>

        {/* Trigger Time */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
            Trigger date & time
          </label>
          <input
            type="datetime-local"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="w-full px-3.5 h-[44px] rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-elevated)] text-[13px] font-semibold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            required
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className="btn-primary w-full h-[44px] text-[14px] font-bold flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
        >
          <Bell size={18} strokeWidth={2.5} />
          <span>{isSubmitting ? 'Saving...' : 'Set reminder'}</span>
        </button>
      </form>
    </BottomSheet>
  );
}
