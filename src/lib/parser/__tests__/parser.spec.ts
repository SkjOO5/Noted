import { describe, it, expect } from 'vitest';
import { dateCases, classifierCases, REF } from './parser.fixtures';
// Adjust these imports to the real module paths from the plan:
import { parseDate } from '../dateParser';
import { classifyMessage } from '../messageClassifier';

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

describe('parseDate', () => {
  it.each(dateCases)('$id: $input', ({ input, results, alternate, firstOnly }) => {
    const out = parseDate(input, REF);

    if (results.length === 0) {
      expect(out).toEqual([]);
      return;
    }

    const actual = firstOnly ? out.slice(0, 1) : out;
    expect(actual).toHaveLength(results.length);

    results.forEach((exp, i) => {
      const got = actual[i];
      expect(fmt(got.date)).toBe(exp.start);
      expect(got.timeConfirmed).toBe(exp.timeConfirmed);
      if (exp.end) expect(fmt(got.endDate!)).toBe(exp.end);
      if (exp.allDay !== undefined) expect(got.allDay).toBe(exp.allDay);
      expect(Boolean(got.isPast)).toBe(Boolean(exp.isPast));
    });

    if (alternate) {
      // Ambiguous input must expose the second interpretation.
      expect(out[0].alternate).toBeDefined();
      expect(fmt(out[0].alternate!.date)).toBe(alternate);
    }
  });

  it('requires an explicit reference date', () => {
    // @ts-expect-error referenceDate is mandatory
    expect(() => parseDate('kal quiz')).toThrow();
  });

  it('is pure: same input and reference give the same output', () => {
    expect(parseDate('kal 10 baje quiz', REF)).toEqual(parseDate('kal 10 baje quiz', REF));
  });
});

describe('classifyMessage', () => {
  it.each(classifierCases)('$id: $input', (c) => {
    const out = classifyMessage(c.input);
    expect(out.type).toBe(c.type);
    expect(out.isImportant).toBe(c.isImportant);
    if (c.subject) expect(out.subject).toBe(c.subject);
    if (c.topic) expect(out.topic).toBe(c.topic);
    if (!c.subject) expect(out.subject).toBeUndefined();
  });
});