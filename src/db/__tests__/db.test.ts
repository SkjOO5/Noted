import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  createGroup,
  getGroupById,
  getAllGroups,
  getOrCreateGroup,
  deleteGroup,
  createMessage,
  getMessagesByGroupId,
  createEvent,
  getEventById,
  getAllEvents,
  deleteEvent,
  createNote,
  getNoteById,
  getAllNotes,
  deleteNote,
  createReminder,
  getDueReminders,
} from '../index';
import 'fake-indexeddb/auto';

describe('Dexie Database & Repositories', () => {
  beforeEach(async () => {
    await db.groups.clear();
    await db.messages.clear();
    await db.events.clear();
    await db.notes.clear();
    await db.reminders.clear();
  });

  describe('Group Repository', () => {
    it('creates and retrieves a group', async () => {
      const id = await createGroup({
        name: 'CSE-B 3rd Sem',
        lastMessageAt: new Date('2026-10-07T10:00:00'),
        unreadCount: 2,
      });

      const group = await getGroupById(id);
      expect(group).toBeDefined();
      expect(group?.name).toBe('CSE-B 3rd Sem');
      expect(group?.unreadCount).toBe(2);
    });

    it('getOrCreateGroup returns existing if exists', async () => {
      const g1 = await getOrCreateGroup('Maths Batch A');
      const g2 = await getOrCreateGroup('Maths Batch A');
      expect(g1.id).toBe(g2.id);

      const all = await getAllGroups();
      expect(all.length).toBe(1);
    });

    it('cascades message deletion when group is deleted', async () => {
      const groupId = await createGroup({
        name: 'Temp Group',
        lastMessageAt: new Date(),
        unreadCount: 0,
      });

      await createMessage({
        groupId,
        sender: 'Alice',
        text: 'Hello',
        timestamp: new Date(),
        hash: 'hash-1',
        chips: [],
        isImportant: false,
      });

      await deleteGroup(groupId);
      const messages = await getMessagesByGroupId(groupId);
      expect(messages.length).toBe(0);
    });
  });

  describe('Message Repository & Deduplication', () => {
    it('creates and deduplicates messages by hash', async () => {
      const groupId = await createGroup({
        name: 'Test Group',
        lastMessageAt: new Date(),
        unreadCount: 0,
      });

      const id1 = await createMessage({
        groupId,
        sender: 'Bob',
        text: 'kal quiz hai',
        timestamp: new Date('2026-10-07T10:00:00'),
        hash: 'unique-hash-1',
        chips: ['quiz'],
        isImportant: true,
      });

      // Try inserting same hash
      const id2 = await createMessage({
        groupId,
        sender: 'Bob',
        text: 'kal quiz hai',
        timestamp: new Date('2026-10-07T10:00:00'),
        hash: 'unique-hash-1',
        chips: ['quiz'],
        isImportant: true,
      });

      expect(id1).toBe(id2);
      const msgs = await getMessagesByGroupId(groupId);
      expect(msgs.length).toBe(1);
    });
  });

  describe('Event Repository', () => {
    it('creates, retrieves, and deletes an event with reminder cascading', async () => {
      const eventId = await createEvent({
        title: 'DBMS Quiz',
        startAt: new Date('2026-10-08T10:00:00'),
        type: 'quiz',
        subject: 'DBMS',
        reminderOffsets: [1440, 60],
        isDone: false,
        timeConfirmed: true,
      });

      await createReminder({
        eventId,
        title: 'DBMS Quiz in 1 hour',
        triggerAt: new Date('2026-10-08T09:00:00'),
        status: 'pending',
      });

      const event = await getEventById(eventId);
      expect(event?.title).toBe('DBMS Quiz');

      const all = await getAllEvents();
      expect(all.length).toBe(1);

      await deleteEvent(eventId);
      const afterDelete = await getEventById(eventId);
      expect(afterDelete).toBeUndefined();

      const reminders = await db.reminders.where('eventId').equals(eventId).toArray();
      expect(reminders.length).toBe(0);
    });
  });

  describe('Note Repository', () => {
    it('creates and prioritizes pinned notes in listing', async () => {
      await createNote({
        text: 'Normal Note',
        isPinned: false,
        tags: ['general'],
      });

      await createNote({
        text: 'Pinned Note',
        isPinned: true,
        tags: ['important'],
      });

      const notes = await getAllNotes();
      expect(notes.length).toBe(2);
      expect(notes[0].text).toBe('Pinned Note');
    });

    it('deletes note cleanly', async () => {
      const id = await createNote({
        text: 'To be deleted',
        isPinned: false,
        tags: [],
      });

      await deleteNote(id);
      const note = await getNoteById(id);
      expect(note).toBeUndefined();
    });
  });

  describe('Reminder Repository', () => {
    it('filters due reminders accurately', async () => {
      const past = new Date('2026-10-07T08:00:00');
      const future = new Date('2026-10-07T12:00:00');
      const now = new Date('2026-10-07T10:00:00');

      await createReminder({
        title: 'Past Reminder',
        triggerAt: past,
        status: 'pending',
      });

      await createReminder({
        title: 'Future Reminder',
        triggerAt: future,
        status: 'pending',
      });

      const due = await getDueReminders(now);
      expect(due.length).toBe(1);
      expect(due[0].title).toBe('Past Reminder');
    });
  });
});
