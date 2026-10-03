import { db, type Reminder } from './db';

export async function createReminder(reminder: Omit<Reminder, 'id' | 'createdAt'>): Promise<number> {
  return await db.reminders.add({
    ...reminder,
    createdAt: new Date(),
  });
}

export async function getReminderById(id: number): Promise<Reminder | undefined> {
  return await db.reminders.get(id);
}

export async function getAllReminders(): Promise<Reminder[]> {
  return await db.reminders.orderBy('triggerAt').toArray();
}

export async function getRemindersByEventId(eventId: number): Promise<Reminder[]> {
  return await db.reminders.where('eventId').equals(eventId).toArray();
}

export async function getPendingReminders(): Promise<Reminder[]> {
  return await db.reminders
    .where('status')
    .equals('pending')
    .sortBy('triggerAt');
}

export async function getDueReminders(now: Date = new Date()): Promise<Reminder[]> {
  return await db.reminders
    .where('triggerAt')
    .belowOrEqual(now)
    .filter((r) => r.status === 'pending' || (r.status === 'snoozed' && !!r.snoozeUntil && r.snoozeUntil <= now))
    .toArray();
}

export async function updateReminder(id: number, changes: Partial<Reminder>): Promise<number> {
  return await db.reminders.update(id, changes);
}

export async function deleteReminder(id: number): Promise<void> {
  await db.reminders.delete(id);
}
