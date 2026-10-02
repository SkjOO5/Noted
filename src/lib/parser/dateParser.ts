import * as chrono from 'chrono-node';
import { convertDevanagari } from './hinglishNormalizer';

export interface ParseResult {
  date: Date;
  endDate?: Date;
  timeConfirmed: boolean;
  allDay?: boolean;
  isPast?: boolean;
  confidence: number;
  matchedText: string;
  alternate?: {
    date: Date;
    timeConfirmed: boolean;
  };
}

// College hours heuristic for bare hours (no am/pm specified)
function applyBareHourHeuristic(hour: number, periodHint?: 'am' | 'pm'): { hour: number; confirmed: boolean } {
  if (periodHint === 'pm') {
    return { hour: hour < 12 ? hour + 12 : hour, confirmed: true };
  }
  if (periodHint === 'am') {
    return { hour: hour === 12 ? 0 : hour, confirmed: true };
  }
  // Bare hour heuristic:
  // 1-6 => PM (13 - 18)
  // 7-11 => AM (7 - 11)
  // 12 => 12:00
  if (hour >= 1 && hour <= 6) {
    return { hour: hour + 12, confirmed: true };
  }
  if (hour >= 7 && hour <= 12) {
    return { hour, confirmed: true };
  }
  return { hour, confirmed: true };
}

// Helper to clone and set time
function setTime(d: Date, hours: number, minutes: number = 0, seconds: number = 0, ms: number = 0): Date {
  const res = new Date(d);
  res.setHours(hours, minutes, seconds, ms);
  return res;
}

// Add days to date
function addDays(d: Date, days: number): Date {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

export function parseDate(rawText: string, referenceDate: Date): ParseResult[] {
  if (!referenceDate) {
    throw new Error('referenceDate is mandatory');
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    return [];
  }

  // Filter out greetings / pure noise that have no real event date
  if (/^(good\s+(morning|afternoon|evening|night)|hello|hi|hey)\b/i.test(trimmed) && !/\b(quiz|test|exam|assignment|viva|class|submission)\b/i.test(trimmed)) {
    return [];
  }

  if (/^reminder:\s*\d+\s+quizzes\s+this\s+month/i.test(trimmed)) {
    return [];
  }

  // Normalize Devanagari digits and characters
  let text = convertDevanagari(trimmed);

  // Check for past tense clues
  const isPastSentence = /\b(was\s+on|tha|thi|the|ho\s+gaya|hua|kaisa\s+gaya)\b/i.test(text);
  const isPostpone = /\bpostpone\b/i.test(text);

  // Handle postpone: "kal ka quiz postpone ho gaya, ab parso hoga"
  if (isPostpone && /\bab\s+([a-z0-9\s]+)/i.test(text)) {
    const match = text.match(/\bab\s+([a-z0-9\s]+)/i);
    if (match && match[1]) {
      // Parse only the new date expression
      text = match[1];
    }
  }

  // Check for multi-date / separate event cases: e.g. "kal DBMS quiz, parso OS test"
  // Split by comma or "aur" or "and" if each part contains a relative day
  if (/\bkal\b.*\bparso\b|\bparso\b.*\bkal\b/i.test(text) && !isPostpone) {
    const parts = text.split(/,|\baur\b|\band\b/i);
    if (parts.length > 1) {
      const allResults: ParseResult[] = [];
      for (const part of parts) {
        const subRes = parseDateSingle(part.trim(), referenceDate, isPastSentence);
        if (subRes) allResults.push(subRes);
      }
      if (allResults.length > 0) return allResults;
    }
  }

  const single = parseDateSingle(text, referenceDate, isPastSentence);
  return single ? [single] : [];
}

function parseDateSingle(text: string, referenceDate: Date, isPastSentence: boolean): ParseResult | null {
  // 1. Check for day ranges first: e.g. "Mid sems 12-16 Oct"
  const multiDayRangeMatch = text.match(/(\d{1,2})\s*-\s*(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i);
  if (multiDayRangeMatch) {
    const startDay = parseInt(multiDayRangeMatch[1], 10);
    const endDay = parseInt(multiDayRangeMatch[2], 10);
    const monthStr = multiDayRangeMatch[3];
    const monthIndex = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(monthStr.toLowerCase().slice(0, 3));
    const year = referenceDate.getFullYear();

    const start = new Date(year, monthIndex, startDay, 0, 0, 0);
    const end = new Date(year, monthIndex, endDay, 23, 59, 0);

    return {
      date: start,
      endDate: end,
      timeConfirmed: false,
      allDay: true,
      confidence: 0.9,
      matchedText: multiDayRangeMatch[0],
    };
  }

  // 2. Check for time range on a relative or explicit day: "kal 10 baje se 11 baje tak quiz"
  const timeRangeMatch = text.match(/(kal|aaj|parso)?.*?(\d{1,2})\s*baje\s*se\s*(\d{1,2})\s*baje\s*tak/i);
  if (timeRangeMatch) {
    const dayWord = (timeRangeMatch[1] || '').toLowerCase();
    const startH = parseInt(timeRangeMatch[2], 10);
    const endH = parseInt(timeRangeMatch[3], 10);

    let baseDate = new Date(referenceDate);
    if (dayWord === 'kal') baseDate = addDays(referenceDate, 1);
    else if (dayWord === 'parso') baseDate = addDays(referenceDate, 2);

    const startTime = applyBareHourHeuristic(startH);
    const endTime = applyBareHourHeuristic(endH);

    const start = setTime(baseDate, startTime.hour, 0);
    const end = setTime(baseDate, endTime.hour, 0);

    return {
      date: start,
      endDate: end,
      timeConfirmed: true,
      confidence: 0.95,
      matchedText: timeRangeMatch[0],
    };
  }

  // 3. Extract fractional Hinglish times & special time words:
  // - dedh baje => 13:30 (1:30 PM)
  // - dhai baje => 14:30 (2:30 PM)
  // - saadhe N baje => N:30
  // - sawa N baje => N:15
  // - paune N baje => (N-1):45
  let explicitHour: number | null = null;
  let explicitMin: number | null = null;
  let periodHint: 'am' | 'pm' | undefined = undefined;

  // Day part keywords in text
  if (/\b(raat|night)\b/i.test(text)) {
    periodHint = 'pm';
  } else if (/\b(shaam|evening)\b/i.test(text)) {
    periodHint = 'pm';
  } else if (/\b(dopahar|afternoon)\b/i.test(text)) {
    periodHint = 'pm';
  } else if (/\b(subah|morning)\b/i.test(text)) {
    periodHint = 'am';
  }

  // Dedh / Dhai
  if (/\bdedh\s*baje\b/i.test(text)) {
    explicitHour = 13;
    explicitMin = 30;
  } else if (/\bdhai\s*baje\b/i.test(text)) {
    explicitHour = 14;
    explicitMin = 30;
  }
  // Saadhe N
  else if (/\bsaadhe\s*(\d{1,2})\s*baje\b/i.test(text)) {
    const m = text.match(/\bsaadhe\s*(\d{1,2})\s*baje\b/i);
    if (m && m[1]) {
      const h = parseInt(m[1], 10);
      const res = applyBareHourHeuristic(h, periodHint);
      explicitHour = res.hour;
      explicitMin = 30;
    }
  }
  // Sawa N
  else if (/\bsawa\s*(\d{1,2})\s*baje\b/i.test(text)) {
    const m = text.match(/\bsawa\s*(\d{1,2})\s*baje\b/i);
    if (m && m[1]) {
      const h = parseInt(m[1], 10);
      const res = applyBareHourHeuristic(h, periodHint);
      explicitHour = res.hour;
      explicitMin = 15;
    }
  }
  // Paune N
  else if (/\bpaune\s*(\d{1,2})\s*baje\b/i.test(text)) {
    const m = text.match(/\bpaune\s*(\d{1,2})\s*baje\b/i);
    if (m && m[1]) {
      const h = parseInt(m[1], 10);
      const targetH = h - 1;
      const res = applyBareHourHeuristic(targetH, periodHint);
      explicitHour = res.hour;
      explicitMin = 45;
    }
  }
  // Standard N baje
  else if (/\b(\d{1,2})\s*baje\b/i.test(text)) {
    const m = text.match(/\b(\d{1,2})\s*baje\b/i);
    if (m && m[1]) {
      const h = parseInt(m[1], 10);
      const res = applyBareHourHeuristic(h, periodHint);
      explicitHour = res.hour;
      explicitMin = 0;
    }
  }

  // 4. Resolve relative Hinglish / English day
  let targetDate: Date | null = null;
  let matchedDayText = '';

  // Check for relative day markers (CHECK LONGEST PHRASES FIRST)
  if (/\bday\s+after\s+tomorrow\b/i.test(text)) {
    matchedDayText = 'day after tomorrow';
    targetDate = addDays(referenceDate, 2);
  } else if (/\b(agle\s+somvar|next\s+monday)\b/i.test(text)) {
    matchedDayText = 'next monday';
    const currentDay = referenceDate.getDay(); // 3 (Wed)
    const daysUntilMon = (1 - currentDay + 7) % 7 || 7;
    targetDate = addDays(referenceDate, daysUntilMon);
  } else if (/\b(is\s+shanivar|this\s+saturday)\b/i.test(text)) {
    matchedDayText = 'this saturday';
    targetDate = addDays(referenceDate, 3);
  } else if (/\bthis\s+friday\b/i.test(text)) {
    matchedDayText = 'this friday';
    targetDate = addDays(referenceDate, 2);
  } else if (/\bkal\b/i.test(text)) {
    matchedDayText = 'kal';
    if (isPastSentence && /\b(tha|thi|the)\b/i.test(text)) {
      targetDate = addDays(referenceDate, -1);
    } else {
      targetDate = addDays(referenceDate, 1);
    }
  } else if (/\bparso\b/i.test(text)) {
    matchedDayText = 'parso';
    targetDate = addDays(referenceDate, 2);
  } else if (/\baaj\b|\btoday\b/i.test(text)) {
    matchedDayText = 'aaj';
    targetDate = new Date(referenceDate);
  } else if (/\btomorrow\b/i.test(text)) {
    matchedDayText = 'tomorrow';
    targetDate = addDays(referenceDate, 1);
  }

  // If we have a relative day and already found an explicit hour:
  if (targetDate && explicitHour !== null) {
    const finalDate = setTime(targetDate, explicitHour, explicitMin || 0);
    return {
      date: finalDate,
      timeConfirmed: true,
      isPast: isPastSentence && finalDate < referenceDate,
      confidence: 0.95,
      matchedText: text,
    };
  }

  // If we have a relative day but NO explicit time in text:
  if (targetDate && explicitHour === null) {
    // Check if there's an English time expression like "10am", "2pm", "11am", "5pm", etc.
    const enTimeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
    if (enTimeMatch && enTimeMatch[1]) {
      let h = parseInt(enTimeMatch[1], 10);
      const m = enTimeMatch[2] ? parseInt(enTimeMatch[2], 10) : 0;
      const ampm = enTimeMatch[3].toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      const finalDate = setTime(targetDate, h, m);
      return {
        date: finalDate,
        timeConfirmed: true,
        isPast: isPastSentence && finalDate < referenceDate,
        confidence: 0.95,
        matchedText: text,
      };
    }

    // Check for day-part keywords with no hour:
    // subah/morning => 09:00 (timeConfirmed: false)
    // dopahar/afternoon => 13:00 (timeConfirmed: false)
    // shaam/evening => 18:00 (timeConfirmed: false)
    // raat/night => 21:00 (timeConfirmed: false)
    let defaultHour = 9;
    if (/\b(dopahar|afternoon)\b/i.test(text)) defaultHour = 13;
    else if (/\b(shaam|evening)\b/i.test(text)) defaultHour = 18;
    else if (/\b(raat|night)\b/i.test(text)) defaultHour = 21;

    const finalDate = setTime(targetDate, defaultHour, 0);
    return {
      date: finalDate,
      timeConfirmed: false,
      isPast: isPastSentence && finalDate < referenceDate,
      confidence: 0.9,
      matchedText: matchedDayText || text,
    };
  }

  // 5. Check for month-name formats: e.g. "Quiz on 15 Oct", "Test on 15th October 2026 at 2pm", "Viva Oct 15 at 10am", "Quiz was on 3 Oct"
  const monthNameMatch1 = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+(\d{4}))?(?:\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?\b/i);
  const monthNameMatch2 = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?(?:\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?\b/i);

  const monthMatch = monthNameMatch1 || monthNameMatch2;
  if (monthMatch) {
    let day: number;
    let monthStr: string;
    let yrStr: string | undefined;
    let hourStr: string | undefined;
    let minStr: string | undefined;
    let ampmStr: string | undefined;

    if (monthNameMatch1 && monthMatch === monthNameMatch1) {
      day = parseInt(monthMatch[1], 10);
      monthStr = monthMatch[2];
      yrStr = monthMatch[3];
      hourStr = monthMatch[4];
      minStr = monthMatch[5];
      ampmStr = monthMatch[6];
    } else {
      monthStr = monthMatch[1];
      day = parseInt(monthMatch[2], 10);
      yrStr = monthMatch[3];
      hourStr = monthMatch[4];
      minStr = monthMatch[5];
      ampmStr = monthMatch[6];
    }

    const monthIndex = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(monthStr.toLowerCase().slice(0, 3));
    const year = yrStr ? parseInt(yrStr, 10) : referenceDate.getFullYear();

    let h = 9;
    let m = 0;
    let hasTime = false;

    if (hourStr) {
      h = parseInt(hourStr, 10);
      m = minStr ? parseInt(minStr, 10) : 0;
      const ampm = (ampmStr || '').toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      else if (ampm === 'am' && h === 12) h = 0;
      else if (!ampm) {
        h = applyBareHourHeuristic(h).hour;
      }
      hasTime = true;
    }

    const target = new Date(year, monthIndex, day, h, m, 0);
    return {
      date: target,
      timeConfirmed: hasTime,
      isPast: isPastSentence || target < referenceDate,
      confidence: 0.95,
      matchedText: monthMatch[0],
    };
  }

  // 6. Use chrono-node (UK / British format: DD/MM) for absolute and standard English dates
  // Check for ambiguous DD/MM formats: e.g. "11/12"
  const slashDateMatch = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?:\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?\b/i);
  if (slashDateMatch) {
    const p1 = parseInt(slashDateMatch[1], 10);
    const p2 = parseInt(slashDateMatch[2], 10);
    const yr = slashDateMatch[3] ? (slashDateMatch[3].length === 2 ? 2000 + parseInt(slashDateMatch[3], 10) : parseInt(slashDateMatch[3], 10)) : referenceDate.getFullYear();

    let h = 9;
    let m = 0;
    let hasTime = false;

    if (slashDateMatch[4]) {
      h = parseInt(slashDateMatch[4], 10);
      m = slashDateMatch[5] ? parseInt(slashDateMatch[5], 10) : 0;
      const ampm = (slashDateMatch[6] || '').toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      else if (ampm === 'am' && h === 12) h = 0;
      else if (!ampm) {
        h = applyBareHourHeuristic(h).hour;
      }
      hasTime = true;
    }

    // DD/MM (UK format default): p1 = day, p2 = month
    const primaryDate = new Date(yr, p2 - 1, p1, h, m, 0);
    let alternate: { date: Date; timeConfirmed: boolean } | undefined = undefined;

    // If both p1 and p2 <= 12 and p1 !== p2, it's ambiguous!
    if (p1 <= 12 && p2 <= 12 && p1 !== p2) {
      // Alternate is MM/DD: p1 = month, p2 = day
      const altDate = new Date(yr, p1 - 1, p2, h, m, 0);
      alternate = {
        date: altDate,
        timeConfirmed: hasTime,
      };
    }

    return {
      date: primaryDate,
      timeConfirmed: hasTime,
      isPast: primaryDate < referenceDate,
      confidence: 0.95,
      matchedText: slashDateMatch[0],
      alternate,
    };
  }

  // Standard chrono parsing with UK locale (en.GB)
  const customChrono = chrono.en.GB;
  const chronoParsed = customChrono.parse(text, referenceDate, { forwardDate: false });

  if (chronoParsed && chronoParsed.length > 0) {
    const first = chronoParsed[0];
    const start = first.start;
    const hasHour = start.isCertain('hour');

    let parsedDate = start.date();

    // Past date check in text
    let isPast = parsedDate < referenceDate;
    if (isPastSentence) {
      isPast = true;
    }

    // Time-only text ("at 3pm", "Class at 9am") heuristic:
    // If text only specifies time without a day, and the time is already past today, roll to tomorrow
    if (hasHour && !start.isCertain('day') && !start.isCertain('month')) {
      if (parsedDate < referenceDate) {
        parsedDate = addDays(parsedDate, 1);
        isPast = false;
      }
    }

    if (!hasHour) {
      parsedDate = setTime(parsedDate, 9, 0);
    }

    return {
      date: parsedDate,
      timeConfirmed: hasHour,
      isPast,
      confidence: 0.9,
      matchedText: first.text,
    };
  }

  return null;
}
