import { useState, useMemo, useEffect } from 'react';
import type { Reminder } from '@/db/db';
import { getAllReminders, updateReminder, deleteReminder } from '@/db/reminderRepo';
import { useLiveQuery } from '@/db/useLiveQuery';
import { AddReminderSheet } from './AddReminderSheet';
import { useToast } from '@/components/ToastContext';
import {
  checkNotificationPermissions,
  requestNotificationPermissions,
  scheduleNativeReminder,
  cancelNativeReminder,
} from '@/lib/remind/nativeNotifications';
import {
  Search,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

type FilterType = 'all' | 'pending' | 'snoozed' | 'done' | 'fired';

export function RemindersTab() {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [hasNotifPerm, setHasNotifPerm] = useState<boolean | null>(null);

  const reminders = useLiveQuery(() => getAllReminders(), []) || [];

  useEffect(() => {
    checkNotificationPermissions().then(setHasNotifPerm);
  }, []);

  const handleRequestPerm = async () => {
    const granted = await requestNotificationPermissions();
    setHasNotifPerm(granted);
    if (granted) {
      showToast({ message: 'Notifications enabled!' });
    } else {
      showToast({ message: 'Notification permission not granted' });
    }
  };

  const handleToggleDone = async (reminder: Reminder) => {
    if (!reminder.id) return;
    const newStatus = reminder.status === 'done' ? 'pending' : 'done';
    try {
      await updateReminder(reminder.id, { status: newStatus });
      if (newStatus === 'done') {
        await cancelNativeReminder(reminder.id);
        showToast({ message: 'Reminder marked as completed' });
      } else {
        await scheduleNativeReminder({ ...reminder, status: newStatus });
        showToast({ message: 'Reminder marked as pending' });
      }
    } catch (err) {
      console.error('Failed to update reminder status:', err);
    }
  };

  const handleSnooze = async (reminder: Reminder, minutes: number) => {
    if (!reminder.id) return;
    const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000);
    try {
      await updateReminder(reminder.id, {
        status: 'snoozed',
        snoozeUntil,
      });
      await scheduleNativeReminder({
        ...reminder,
        triggerAt: snoozeUntil,
        status: 'snoozed',
        snoozeUntil,
      });
      showToast({
        message: `Snoozed for ${minutes >= 60 ? `${minutes / 60} hour(s)` : `${minutes} mins`}`,
      });
    } catch (err) {
      console.error('Failed to snooze reminder:', err);
    }
  };

  const handleDelete = async (reminder: Reminder) => {
    if (!reminder.id) return;
    const oldReminder = { ...reminder };
    const id = reminder.id;

    try {
      await cancelNativeReminder(id);
      await deleteReminder(id);

      showToast({
        message: 'Reminder deleted',
        actionLabel: 'Undo',
        onAction: async () => {
          await updateReminder(id, oldReminder);
          await scheduleNativeReminder(oldReminder);
        },
      });
    } catch (err) {
      console.error('Failed to delete reminder:', err);
    }
  };

  const formatDateTime = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (isToday) return `Today at ${timeStr}`;

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      d.getDate() === tomorrow.getDate() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getFullYear() === tomorrow.getFullYear();

    if (isTomorrow) return `Tomorrow at ${timeStr}`;

    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
  };

  const filteredReminders = useMemo(() => {
    return reminders.filter((r) => {
      // Filter tab
      if (activeFilter === 'pending' && r.status !== 'pending') return false;
      if (activeFilter === 'snoozed' && r.status !== 'snoozed') return false;
      if (activeFilter === 'done' && r.status !== 'done') return false;
      if (activeFilter === 'fired' && r.status !== 'fired') return false;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return r.title.toLowerCase().includes(q);
      }

      return true;
    });
  }, [reminders, activeFilter, searchQuery]);

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {/* Toolbar row (search + new reminder) */}
      <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
        <div className="relative h-[44px] flex items-center">
          <Search
            size={18}
            strokeWidth={2}
            className="absolute left-3 text-[var(--color-muted)] pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search reminders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-full pl-10 pr-3 rounded-[var(--radius-button)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[14px] font-normal text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="btn-primary h-[44px] px-3.5 text-[13px] font-semibold flex items-center justify-center gap-1.5"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Reminder</span>
        </button>
      </div>

      {/* Permission banner if notifications not granted */}
      {hasNotifPerm === false && (
        <div className="flex items-center justify-between p-3.5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-warn)]/40 text-[var(--color-text)] shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle size={18} className="text-[var(--color-warn)] shrink-0" />
            <p className="text-[12px] font-medium text-[var(--color-warn)]">
              Enable notifications to get timely sound alerts on your phone.
            </p>
          </div>
          <button
            onClick={handleRequestPerm}
            className="px-3 py-1.5 rounded-full bg-[var(--color-warn)] text-[#0B141A] font-bold text-[11px] whitespace-nowrap cursor-pointer shrink-0 shadow-xs ml-2"
          >
            Enable
          </button>
        </div>
      )}

      {/* Filter chips row */}
      <div className="flex items-center gap-1.5 overflow-x-auto px-4 -mx-4 py-0.5 snap-x no-scrollbar">
        {(
          [
            { id: 'all', label: 'All', count: reminders.length },
            { id: 'pending', label: 'Upcoming', count: reminders.filter((r) => r.status === 'pending').length },
            { id: 'snoozed', label: 'Snoozed', count: reminders.filter((r) => r.status === 'snoozed').length },
            { id: 'fired', label: 'Due / Fired', count: reminders.filter((r) => r.status === 'fired').length },
            { id: 'done', label: 'Done', count: reminders.filter((r) => r.status === 'done').length },
          ] as const
        ).map((tab) => {
          const isSelected = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`h-8 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors border shrink-0 snap-start cursor-pointer flex items-center gap-1.5 select-none ${
                isSelected
                  ? 'bg-[var(--color-accent)] text-[#0B141A] border-transparent shadow-xs'
                  : 'bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[11px] ${
                  isSelected ? 'opacity-90 font-bold' : 'text-[var(--color-muted)]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Reminders List or Empty State */}
      {filteredReminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4 my-auto">
          <p className="text-[13px] text-[var(--color-muted)] font-normal">
            {searchQuery || activeFilter !== 'all'
              ? 'No matching reminders found'
              : 'No reminders scheduled yet'}
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="btn-primary"
          >
            <Plus size={18} strokeWidth={2} />
            <span>Set a reminder</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredReminders.map((reminder) => {
            const isDone = reminder.status === 'done';
            const isSnoozed = reminder.status === 'snoozed';
            const isPast = new Date(reminder.triggerAt).getTime() < Date.now();

            return (
              <div
                key={reminder.id}
                data-card="true"
                className={`flex flex-col p-3.5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/40 shadow-xs transition-colors gap-2.5 ${
                  isDone ? 'opacity-60' : ''
                }`}
              >
                {/* Top row: Checkbox, Title, Status badge */}
                <div className="flex items-start gap-3 justify-between">
                  <button
                    onClick={() => handleToggleDone(reminder)}
                    className="mt-0.5 text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer shrink-0"
                    title={isDone ? 'Mark as pending' : 'Mark as done'}
                  >
                    {isDone ? (
                      <CheckCircle2 size={18} className="text-[var(--color-accent)]" />
                    ) : (
                      <Circle size={18} strokeWidth={1.75} />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h3
                      className={`text-[14px] font-semibold text-[var(--color-text)] leading-snug break-words ${
                        isDone ? 'line-through text-[var(--color-muted)]' : ''
                      }`}
                    >
                      {reminder.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-[12px] font-normal text-[var(--color-muted)]">
                      <Clock size={12} strokeWidth={2} className="shrink-0" />
                      <span>{formatDateTime(reminder.triggerAt)}</span>
                      {isSnoozed && reminder.snoozeUntil && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[rgba(245,195,68,0.15)] text-[var(--color-exam)] border border-[rgba(245,195,68,0.3)] text-[10px] font-semibold">
                          Snoozed till {new Date(reminder.snoozeUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {reminder.status === 'fired' && isPast && !isDone && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[rgba(255,107,107,0.15)] text-[var(--color-quiz)] border border-[rgba(255,107,107,0.3)] text-[10px] font-semibold">
                          Fired
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(reminder)}
                    className="w-8 h-8 flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-elevated)] rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Delete reminder"
                  >
                    <Trash2 size={15} strokeWidth={1.75} />
                  </button>
                </div>

                {/* Bottom Quick Snooze Presets if not done */}
                {!isDone && (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--color-border)]/50 text-xs">
                    <span className="text-[10px] tracking-[1.2px] uppercase text-[var(--color-muted)] font-semibold mr-1 flex items-center gap-1">
                      <RotateCcw size={11} />
                      <span>Snooze:</span>
                    </span>
                    <button
                      onClick={() => handleSnooze(reminder, 15)}
                      className="px-2.5 py-1 rounded-md bg-[var(--color-elevated)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-text)] text-[11px] font-semibold transition-colors cursor-pointer shadow-xs"
                    >
                      +15m
                    </button>
                    <button
                      onClick={() => handleSnooze(reminder, 60)}
                      className="px-2.5 py-1 rounded-md bg-[var(--color-elevated)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-text)] text-[11px] font-semibold transition-colors cursor-pointer shadow-xs"
                    >
                      +1h
                    </button>
                    <button
                      onClick={() => handleSnooze(reminder, 1440)}
                      className="px-2.5 py-1 rounded-md bg-[var(--color-elevated)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-text)] text-[11px] font-semibold transition-colors cursor-pointer shadow-xs"
                    >
                      +1d
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Reminder Sheet */}
      <AddReminderSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </div>
  );
}
