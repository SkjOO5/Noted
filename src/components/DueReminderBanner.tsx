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
    <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-2.5 flex flex-col gap-2 shrink-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] text-[#0B141A] flex items-center justify-center shrink-0 shadow-xs">
            <Bell size={16} strokeWidth={2} className="animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--color-text)] truncate">
              {currentReminder.title}
            </p>
            <p className="text-[11px] font-semibold text-[var(--color-accent)]">
              Due now {activeDueReminders.length > 1 ? `(+${activeDueReminders.length - 1} more)` : ''}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
          <button
            onClick={() => handleDone(currentReminder)}
            className="btn-primary h-[34px] px-3 text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer"
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
              className="flex items-center gap-1 px-2.5 h-[34px] rounded-[var(--radius-button)] bg-[var(--color-elevated)] border border-[var(--color-border)] text-[var(--color-text)] text-[12px] font-semibold transition-colors cursor-pointer shadow-xs"
              title="Snooze"
            >
              <Clock size={13} strokeWidth={1.8} />
              <span>Snooze</span>
              <ChevronDown size={12} strokeWidth={1.8} />
            </button>

            {snoozeMenuOpenId === currentReminder.id && (
              <div className="absolute right-0 top-full mt-1.5 w-36 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-lg z-50 py-1 flex flex-col divide-y divide-[var(--color-border)]">
                <button
                  onClick={() => handleSnooze(currentReminder, 10, '10 min')}
                  className="px-3 py-2 text-left text-[12px] font-medium text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors cursor-pointer"
                >
                  10 minutes
                </button>
                <button
                  onClick={() => handleSnooze(currentReminder, 60, '1 hour')}
                  className="px-3 py-2 text-left text-[12px] font-medium text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors cursor-pointer"
                >
                  1 hour
                </button>
                <button
                  onClick={() => handleSnooze(currentReminder, 1440, 'Tomorrow')}
                  className="px-3 py-2 text-left text-[12px] font-medium text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors cursor-pointer"
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
