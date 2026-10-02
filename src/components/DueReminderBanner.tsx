import { useEffect, useState } from 'react';
import { useLiveQuery } from '@/db/useLiveQuery';
import { db, type Reminder } from '@/db/db';
import {
  checkAndFireDueReminders,
  markReminderDone,
  snoozeReminder,
} from '@/lib/remind/reminderScheduler';
import { useToast } from './ToastContext';
import { Bell, Check, Clock, ChevronDown } from 'lucide-react';

export function DueReminderBanner() {
  const { showToast } = useToast();
  const [snoozeMenuOpenId, setSnoozeMenuOpenId] = useState<number | null>(null);

  // Periodically check and trigger due reminders
  useEffect(() => {
    checkAndFireDueReminders();
    const interval = setInterval(() => {
      checkAndFireDueReminders();
    }, 20000); // every 20 seconds

    const onFocus = () => {
      checkAndFireDueReminders();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Live query for active fired reminders
  const activeDueReminders = useLiveQuery(
    () =>
      db.reminders
        .where('status')
        .equals('fired')
        .toArray(),
    []
  ) || [];

  if (activeDueReminders.length === 0) {
    return null;
  }

  const currentReminder = activeDueReminders[0];

  const handleDone = async (reminder: Reminder) => {
    if (!reminder.id) return;
    await markReminderDone(reminder.id);
    showToast({
      message: `Completed: ${reminder.title}`,
      actionLabel: 'Undo',
      onAction: async () => {
        if (!reminder.id) return;
        await db.reminders.update(reminder.id, { status: 'fired' });
      },
    });
  };

  const handleSnooze = async (reminder: Reminder, minutes: number, label: string) => {
    if (!reminder.id) return;
    await snoozeReminder(reminder.id, minutes);
    setSnoozeMenuOpenId(null);
    showToast({
      message: `Snoozed for ${label}`,
    });
  };

  return (
    <div className="bg-[var(--color-elevated)] border-b border-[var(--color-accent)]/40 px-4 py-2.5 flex flex-col gap-2 shrink-0 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] flex items-center justify-center shrink-0">
            <Bell size={15} className="animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--color-text)] truncate">
              {currentReminder.title}
            </p>
            <p className="text-[11px] text-[var(--color-accent)] font-medium">
              Reminder Due Now {activeDueReminders.length > 1 ? `(+${activeDueReminders.length - 1} more)` : ''}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
          <button
            onClick={() => handleDone(currentReminder)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--color-accent)] text-black text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
            style={{ minHeight: '32px' }}
            title="Mark Done"
          >
            <Check size={14} strokeWidth={2.5} />
            <span>Done</span>
          </button>

          <div className="relative">
            <button
              onClick={() =>
                setSnoozeMenuOpenId(
                  snoozeMenuOpenId === currentReminder.id ? null : (currentReminder.id || null)
                )
              }
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] text-xs font-medium transition-colors cursor-pointer"
              style={{ minHeight: '32px' }}
              title="Snooze"
            >
              <Clock size={13} />
              <span>Snooze</span>
              <ChevronDown size={12} />
            </button>

            {snoozeMenuOpenId === currentReminder.id && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-50 py-1 flex flex-col">
                <button
                  onClick={() => handleSnooze(currentReminder, 10, '10 min')}
                  className="px-3 py-1.5 text-left text-xs text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors cursor-pointer"
                >
                  10 Minutes
                </button>
                <button
                  onClick={() => handleSnooze(currentReminder, 60, '1 hour')}
                  className="px-3 py-1.5 text-left text-xs text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors cursor-pointer"
                >
                  1 Hour
                </button>
                <button
                  onClick={() => handleSnooze(currentReminder, 1440, 'Tomorrow')}
                  className="px-3 py-1.5 text-left text-xs text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors cursor-pointer"
                >
                  Tomorrow
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
