import { db, type Reminder, type Group, type Message, type CalendarEvent, type Note } from '@/db/db';
import { getDueReminders, updateReminder } from '@/db/reminderRepo';
import { isQuietHoursActive, getSettings, saveSettings } from '@/lib/settings/settingsManager';

export async function hasNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch {
    return false;
  }
}

export async function checkAndFireDueReminders(now: Date = new Date()): Promise<Reminder[]> {
  const due = await getDueReminders(now);
  if (due.length === 0) return [];

  const inQuietHours = isQuietHoursActive(now);

  for (const reminder of due) {
    if (!reminder.id) continue;

    // If quiet hours are active, do not fire browser notification right now, but record
    if (!inQuietHours && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification(reminder.title, {
            body: 'Tap to open Noted',
            icon: '/icon-192.png',
            tag: `reminder-${reminder.id}`,
            data: { reminderId: reminder.id, eventId: reminder.eventId },
          });
        } else {
          new Notification(reminder.title, {
            body: 'Tap to open Noted',
            icon: '/icon-192.png',
            tag: `reminder-${reminder.id}`,
          });
        }
      } catch (err) {
        console.warn('Notification trigger failed:', err);
      }
    }

    // Mark status as fired
    await updateReminder(reminder.id, { status: 'fired' });
  }

  return due;
}

export async function snoozeReminder(
  reminderId: number,
  durationMinutes: number
): Promise<void> {
  const snoozeUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
  await updateReminder(reminderId, {
    status: 'snoozed',
    snoozeUntil,
  });
}

export async function markReminderDone(reminderId: number): Promise<void> {
  await updateReminder(reminderId, {
    status: 'done',
  });
}

export interface FullBackupData {
  version: number;
  exportedAt: string;
  settings: ReturnType<typeof getSettings>;
  groups: Group[];
  messages: Message[];
  events: CalendarEvent[];
  notes: Note[];
  reminders: Reminder[];
}

export async function exportAllData(): Promise<string> {
  const groups = await db.groups.toArray();
  const messages = await db.messages.toArray();
  const events = await db.events.toArray();
  const notes = await db.notes.toArray();
  const reminders = await db.reminders.toArray();
  const settings = getSettings();

  const backup: FullBackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    groups,
    messages,
    events,
    notes,
    reminders,
  };

  return JSON.stringify(backup, null, 2);
}

export function downloadDataBackup(jsonString: string, filename = 'whatsapptext-backup.json'): void {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function wipeAllData(): Promise<void> {
  await db.transaction('rw', [db.groups, db.messages, db.events, db.notes, db.reminders], async () => {
    await db.groups.clear();
    await db.messages.clear();
    await db.events.clear();
    await db.notes.clear();
    await db.reminders.clear();
  });
}

export async function importAllData(jsonString: string): Promise<{ success: boolean; counts: Record<string, number> }> {
  const parsed = JSON.parse(jsonString) as FullBackupData;
  if (!parsed || !Array.isArray(parsed.groups)) {
    throw new Error('Invalid backup file format');
  }

  await wipeAllData();

  if (parsed.settings) {
    saveSettings(parsed.settings);
  }

  await db.transaction('rw', [db.groups, db.messages, db.events, db.notes, db.reminders], async () => {
    if (parsed.groups?.length) await db.groups.bulkAdd(parsed.groups);
    if (parsed.messages?.length) await db.messages.bulkAdd(parsed.messages);
    if (parsed.events?.length) await db.events.bulkAdd(parsed.events);
    if (parsed.notes?.length) await db.notes.bulkAdd(parsed.notes);
    if (parsed.reminders?.length) await db.reminders.bulkAdd(parsed.reminders);
  });

  return {
    success: true,
    counts: {
      groups: parsed.groups?.length || 0,
      messages: parsed.messages?.length || 0,
      events: parsed.events?.length || 0,
      notes: parsed.notes?.length || 0,
      reminders: parsed.reminders?.length || 0,
    },
  };
}
