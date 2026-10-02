import { db, type Note } from './db';

export async function createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  const now = new Date();
  const id = await db.notes.add({
    ...note,
    createdAt: now,
    updatedAt: now,
  });
  if (note.sourceMessageId) {
    await db.messages.update(note.sourceMessageId, { noteId: id });
  }
  return id;
}

export async function getNoteById(id: number): Promise<Note | undefined> {
  return await db.notes.get(id);
}

export async function getAllNotes(): Promise<Note[]> {
  const notes = await db.notes.toArray();
  // Pinned notes first, then newest updated first
  return notes.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}

export async function getNotesBySubject(subject: string): Promise<Note[]> {
  return await db.notes.where('subject').equals(subject).toArray();
}

export async function getNoteByLinkedEventId(eventId: number): Promise<Note | undefined> {
  return await db.notes.where('linkedEventId').equals(eventId).first();
}

export async function updateNote(id: number, changes: Partial<Note>): Promise<number> {
  return await db.notes.update(id, {
    ...changes,
    updatedAt: new Date(),
  });
}

export async function deleteNote(id: number): Promise<void> {
  await db.transaction('rw', [db.notes, db.messages], async () => {
    const note = await db.notes.get(id);
    if (note?.sourceMessageId) {
      await db.messages.update(note.sourceMessageId, { noteId: undefined });
    }
    await db.notes.delete(id);
  });
}
