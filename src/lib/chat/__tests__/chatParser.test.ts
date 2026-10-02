import { describe, it, expect } from 'vitest';
import { parseWhatsAppChat, computeMessageHash } from '../chatParser';

describe('WhatsApp Chat & Paste Parser', () => {
  it('parses standard Android format with 12-hour time and AM/PM', () => {
    const chat = `12/10/26, 9:41 pm - Aman CSE: kal 10 baje DBMS quiz hai
12/10/26, 9:42 pm - Rohan: Unit 3 tak aayega na?`;

    const result = parseWhatsAppChat(chat);
    expect(result).toHaveLength(2);

    expect(result[0].sender).toBe('Aman CSE');
    expect(result[0].text).toBe('kal 10 baje DBMS quiz hai');
    expect(result[0].timestamp.getFullYear()).toBe(2026);
    expect(result[0].timestamp.getMonth()).toBe(9); // 0-indexed month (10 -> Oct)
    expect(result[0].timestamp.getDate()).toBe(12);
    expect(result[0].timestamp.getHours()).toBe(21); // 9 pm -> 21
    expect(result[0].timestamp.getMinutes()).toBe(41);
    expect(result[0].chips).toContain('quiz');
    expect(result[0].subject).toBe('DBMS');
    expect(result[0].isImportant).toBe(true);

    expect(result[1].sender).toBe('Rohan');
    expect(result[1].text).toBe('Unit 3 tak aayega na?');
    expect(result[1].topic).toBe('Unit 3');
    expect(result[1].isImportant).toBe(true);
  });

  it('parses Android format with 24-hour time and full 4-digit year', () => {
    const chat = `15/10/2026, 08:30 - Prof Sharma: Room change: DBMS lecture shifted to Room 204`;

    const result = parseWhatsAppChat(chat);
    expect(result).toHaveLength(1);
    expect(result[0].sender).toBe('Prof Sharma');
    expect(result[0].timestamp.getHours()).toBe(8);
    expect(result[0].timestamp.getMinutes()).toBe(30);
    expect(result[0].chips).toContain('room-change');
    expect(result[0].subject).toBe('DBMS');
    expect(result[0].isImportant).toBe(true);
  });

  it('parses iOS bracketed format with seconds and 24-hour time', () => {
    const chat = `[18/10/26, 21:41:00] CR CSE: Assignment submission last date 18/10 5pm
[18/10/26, 21:42:15] CR CSE: Submit to Google Classroom`;

    const result = parseWhatsAppChat(chat);
    expect(result).toHaveLength(2);

    expect(result[0].sender).toBe('CR CSE');
    expect(result[0].text).toBe('Assignment submission last date 18/10 5pm');
    expect(result[0].timestamp.getHours()).toBe(21);
    expect(result[0].timestamp.getMinutes()).toBe(41);
    expect(result[0].timestamp.getSeconds()).toBe(0);
    expect(result[0].chips).toContain('assignment');
    expect(result[0].isImportant).toBe(true);

    expect(result[1].sender).toBe('CR CSE');
    expect(result[1].timestamp.getSeconds()).toBe(15);
  });

  it('parses iOS bracketed format with 12-hour AM/PM', () => {
    const chat = `[07/10/26, 11:00:00 AM] +91 98765 43210: कल सुबह ८ बजे DBMS क्विज़ है`;

    const result = parseWhatsAppChat(chat);
    expect(result).toHaveLength(1);
    expect(result[0].sender).toBe('+91 98765 43210');
    expect(result[0].timestamp.getHours()).toBe(11);
    expect(result[0].chips).toContain('quiz');
    expect(result[0].subject).toBe('DBMS');
  });

  it('preserves multi-line messages correctly', () => {
    const chat = `12/10/26, 10:00 am - Teacher: Mid sem syllabus:
- Unit 1: ER Diagrams
- Unit 2: Relational Algebra
- Unit 3: Normalization
Prepare well!`;

    const result = parseWhatsAppChat(chat);
    expect(result).toHaveLength(1);
    expect(result[0].sender).toBe('Teacher');
    expect(result[0].text).toContain('Mid sem syllabus:');
    expect(result[0].text).toContain('- Unit 1: ER Diagrams');
    expect(result[0].text).toContain('- Unit 3: Normalization');
    expect(result[0].text).toContain('Prepare well!');
    expect(result[0].isImportant).toBe(true);
  });

  it('filters out system notifications and encryption messages', () => {
    const chat = `12/10/26, 9:00 am - Messages and calls are end-to-end encrypted. No one outside of this chat can read them.
12/10/26, 9:01 am - You created group "CSE-B Official"
12/10/26, 9:05 am - Aman: kal chutti hai`;

    const result = parseWhatsAppChat(chat);
    expect(result).toHaveLength(1);
    expect(result[0].sender).toBe('Aman');
    expect(result[0].text).toBe('kal chutti hai');
    expect(result[0].chips).toContain('holiday');
  });

  it('handles raw unformatted text paste as a single message', () => {
    const text = `kal 10 baje DBMS quiz, unit 3 tak`;
    const result = parseWhatsAppChat(text);

    expect(result).toHaveLength(1);
    expect(result[0].sender).toBe('Shared Message');
    expect(result[0].text).toBe('kal 10 baje DBMS quiz, unit 3 tak');
    expect(result[0].chips).toContain('quiz');
    expect(result[0].subject).toBe('DBMS');
    expect(result[0].topic).toBe('Unit 3');
    expect(result[0].isImportant).toBe(true);
  });

  it('returns empty array for empty or whitespace text', () => {
    expect(parseWhatsAppChat('')).toEqual([]);
    expect(parseWhatsAppChat('   \n\n  ')).toEqual([]);
  });

  it('computes deterministic message hashes for deduplication', () => {
    const d1 = new Date(2026, 9, 12, 10, 0, 0);
    const d2 = new Date(2026, 9, 12, 10, 0, 0);
    const d3 = new Date(2026, 9, 12, 10, 0, 1);

    const h1 = computeMessageHash('Aman', 'kal quiz hai', d1);
    const h2 = computeMessageHash('Aman', 'kal quiz hai', d2);
    const h3 = computeMessageHash('Aman', 'kal quiz hai', d3);
    const h4 = computeMessageHash('Rohan', 'kal quiz hai', d1);

    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).not.toBe(h4);
  });
});
