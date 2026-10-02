import { db, type CalendarEvent } from './db';

export async function createEvent(event: Omit<CalendarEvent, 'id' | 'createdAt'>): Promise<number> {
  const id = await db.events.add({
    ...event,
    createdAt: new Date(),
  });
  if (event.sourceMessageId) {
    await db.messages.update(event.sourceMessageId, { calendarEventId: id });
  }
  return id;
}

export async function getEventById(id: number): Promise<CalendarEvent | undefined> {
  return await db.events.get(id);
}

export async function getAllEvents(): Promise<CalendarEvent[]> {
  return await db.events.orderBy('startAt').toArray();
}

export async function getEventsByDateRange(start: Date, end: Date): Promise<CalendarEvent[]> {
  return await db.events
    .where('startAt')
    .between(start, end, true, true)
    .toArray();
}

export async function getEventsBySubject(subject: string): Promise<CalendarEvent[]> {
  return await db.events.where('subject').equals(subject).toArray();
}

export async function updateEvent(id: number, changes: Partial<CalendarEvent>): Promise<number> {
  return await db.events.update(id, changes);
}

export async function deleteEvent(id: number): Promise<void> {
  await db.transaction('rw', [db.events, db.messages, db.reminders], async () => {
    // Unlink from message
    const event = await db.events.get(id);
    if (event?.sourceMessageId) {
      await db.messages.update(event.sourceMessageId, { calendarEventId: undefined });
    }
    // Delete associated reminders
    await db.reminders.where('eventId').equals(id).delete();
    // Delete event
    await db.events.delete(id);
  });
}
