import Dexie, { type Table } from 'dexie';
import type { MsgType } from '@/lib/parser/__tests__/parser.fixtures';

export interface Group {
  id?: number;
  name: string;
  lastMessageText?: string;
  lastMessageAt: Date;
  unreadCount: number;
  avatarColor?: string;
}

export interface Message {
  id?: number;
  groupId: number;
  sender: string;
  text: string;
  timestamp: Date;
  hash: string; // SHA-256 or fast hash for deduplication
  chips: MsgType[];
  calendarEventId?: number;
  noteId?: number;
  isImportant: boolean;
  subject?: string;
  topic?: string;
}

export type EventType = 'quiz' | 'exam' | 'deadline' | 'assignment' | 'class-change' | 'other';

export interface CalendarEvent {
  id?: number;
  title: string;
  startAt: Date;
  endAt?: Date;
  allDay?: boolean;
  type: EventType;
  subject?: string;
  sourceMessageId?: number;
  reminderOffsets: number[]; // in minutes before event: e.g. [1440, 60] = 1 day, 1 hour
  isDone: boolean;
  timeConfirmed: boolean;
  createdAt: Date;
}

export interface Note {
  id?: number;
  text: string;
  subject?: string;
  linkedEventId?: number;
  sourceMessageId?: number;
  isPinned: boolean;
  tags: string[];
  checklist?: { text: string; done: boolean }[];
  createdAt: Date;
  updatedAt: Date;
}

export type ReminderStatus = 'pending' | 'fired' | 'snoozed' | 'done';

export interface Reminder {
  id?: number;
  eventId?: number;
  noteId?: number;
  messageId?: number;
  title: string;
  triggerAt: Date;
  status: ReminderStatus;
  snoozeUntil?: Date;
  createdAt: Date;
}

export class WhatsAppTextDB extends Dexie {
  groups!: Table<Group, number>;
  messages!: Table<Message, number>;
  events!: Table<CalendarEvent, number>;
  notes!: Table<Note, number>;
  reminders!: Table<Reminder, number>;

  constructor() {
    super('WhatsAppTextDB');
    this.version(1).stores({
      groups: '++id, name, lastMessageAt',
      messages: '++id, groupId, timestamp, hash, isImportant',
      events: '++id, startAt, type, subject, sourceMessageId, isDone',
      notes: '++id, subject, linkedEventId, sourceMessageId, isPinned, createdAt',
      reminders: '++id, eventId, triggerAt, status',
    });
  }
}

export const db = new WhatsAppTextDB();
