import { describe, it, expect } from 'vitest';
import { generateIcs, formatIcsDateTime, formatIcsDateOnly, escapeIcsText } from '../icsExporter';
import type { CalendarEvent } from '@/db/db';

describe('icsExporter', () => {
  it('escapes special characters correctly in iCalendar format', () => {
    expect(escapeIcsText('Hello; World, How are you? \\ Test\nNew line')).toBe(
      'Hello\\; World\\, How are you? \\\\ Test\\nNew line'
    );
  });

  it('formats dates properly', () => {
    const d = new Date(Date.UTC(2026, 9, 12, 10, 0, 0));
    expect(formatIcsDateTime(d)).toBe('20261012T100000Z');
    expect(formatIcsDateOnly(d)).toMatch(/^\d{8}$/);
  });

  it('generates valid VCALENDAR with timed events and all-day events', () => {
    const events: CalendarEvent[] = [
      {
        id: 1,
        title: 'DBMS QUIZ - Unit 3',
        startAt: new Date('2026-10-13T10:00:00Z'),
        endAt: new Date('2026-10-13T11:00:00Z'),
        allDay: false,
        type: 'quiz',
        subject: 'DBMS',
        reminderOffsets: [1440, 60],
        isDone: false,
        timeConfirmed: true,
        createdAt: new Date(),
      },
      {
        id: 2,
        title: 'Mid Sems Start',
        startAt: new Date('2026-10-14T09:00:00Z'),
        allDay: true,
        type: 'exam',
        reminderOffsets: [1440],
        isDone: true,
        timeConfirmed: false,
        createdAt: new Date(),
      },
    ];

    const ics = generateIcs(events);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('SUMMARY:DBMS QUIZ - Unit 3');
    expect(ics).toContain('CATEGORIES:QUIZ');
    expect(ics).toContain('STATUS:CONFIRMED');
    expect(ics).toContain('SUMMARY:Mid Sems Start');
    expect(ics).toContain('CATEGORIES:EXAM');
    expect(ics).toContain('STATUS:COMPLETED');
    expect(ics).toContain('DTSTART;VALUE=DATE:');
    expect(ics).toContain('END:VCALENDAR');
  });
});
