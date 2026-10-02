import type { CalendarEvent } from '@/db/db';

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatIcsDateTime(date: Date): string {
  const d = new Date(date);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export function formatIcsDateOnly(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function generateIcs(events: CalendarEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WhatsAppText//College Companion App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  const now = new Date();
  const dtstamp = formatIcsDateTime(now);

  for (const event of events) {
    const start = new Date(event.startAt);
    const uid = `event-${event.id ?? Math.random().toString(36).substring(2, 9)}@whatsapptext.app`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);

    if (event.allDay) {
      const dtstart = formatIcsDateOnly(start);
      // For allDay, DTEND is next day
      const nextDay = new Date(start);
      nextDay.setDate(nextDay.getDate() + 1);
      const dtend = formatIcsDateOnly(nextDay);
      lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
      lines.push(`DTEND;VALUE=DATE:${dtend}`);
    } else {
      lines.push(`DTSTART:${formatIcsDateTime(start)}`);
      const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 60 * 60 * 1000);
      lines.push(`DTEND:${formatIcsDateTime(end)}`);
    }

    lines.push(`SUMMARY:${escapeIcsText(event.title)}`);

    const descriptions: string[] = [];
    if (event.subject) descriptions.push(`Subject: ${event.subject}`);
    if (event.type) descriptions.push(`Type: ${event.type.toUpperCase()}`);
    if (!event.timeConfirmed) descriptions.push('Note: Time is unconfirmed (defaulted to 9:00 AM)');

    if (descriptions.length > 0) {
      lines.push(`DESCRIPTION:${escapeIcsText(descriptions.join('\\n'))}`);
    }

    lines.push(`CATEGORIES:${event.type.toUpperCase()}`);
    lines.push(`STATUS:${event.isDone ? 'COMPLETED' : 'CONFIRMED'}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

export function downloadIcs(events: CalendarEvent[], filename = 'whatsapptext-calendar.ics'): void {
  if (events.length === 0) return;
  const icsData = generateIcs(events);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
