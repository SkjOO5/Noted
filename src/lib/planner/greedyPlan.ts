import type { PlanRequest, Plan, StudyBlock } from './types';

function parseHHMM(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getMinuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function getDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isOverlapping(s1: number, e1: number, s2: number, e2: number): boolean {
  return s1 < e2 && s2 < e1;
}

export function greedyPlan(request: PlanRequest): Plan {
  const now = new Date(request.now);
  const horizonMs = request.horizonDays * 24 * 3600 * 1000;
  const horizonEnd = new Date(now.getTime() + horizonMs);
  const prefs = request.prefs;

  const blockMs = prefs.blockMinutes * 60 * 1000;
  const breakMs = prefs.breakMinutes * 60 * 1000;
  const bufferMs = (prefs.bufferHoursBeforeDeadline || 0) * 3600 * 1000;

  const sleepStartMin = parseHHMM(prefs.sleepStart);
  const sleepEndMin = parseHHMM(prefs.sleepEnd);

  // Relevant academic events in the planning horizon
  const relevantEvents = request.events
    .filter((e) => e.kind === 'quiz' || e.kind === 'exam' || e.kind === 'assignment')
    .map((e) => ({
      ...e,
      startDate: new Date(e.startAt),
    }))
    .filter((e) => e.startDate > now && e.startDate <= horizonEnd)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const placedBlocks: StudyBlock[] = [];
  const dailyStudyMinutes = new Map<string, number>();

  const getPreferredHours = (bestTime: string): { startH: number; endH: number } => {
    switch (bestTime) {
      case 'morning':
        return { startH: 8, endH: 12 };
      case 'afternoon':
        return { startH: 13, endH: 17 };
      case 'evening':
      default:
        return { startH: 18, endH: 22 };
    }
  };

  const isSlotValid = (start: Date, end: Date, eventDeadline: Date): boolean => {
    const sMs = start.getTime();
    const eMs = end.getTime();

    // 1. Must be ahead of now and respect event deadline & buffer
    if (sMs < now.getTime()) return false;
    if (eMs > eventDeadline.getTime() - bufferMs) return false;

    // 2. Check sleep window
    const sMin = getMinuteOfDay(start);
    const eMin = getMinuteOfDay(end);
    if (sleepStartMin <= sleepEndMin) {
      if (sMin < sleepEndMin && eMin > sleepStartMin) return false;
    } else {
      if (sMin >= sleepStartMin || sMin < sleepEndMin) return false;
      if (eMin > sleepStartMin || (eMin <= sleepEndMin && eMin > 0)) return false;
    }

    // 3. Check classes
    const weekday = start.getDay();
    const classes = request.classes.filter((c) => c.weekday === weekday);
    for (const cls of classes) {
      if (isOverlapping(sMin, eMin, cls.startMinute, cls.endMinute)) {
        return false;
      }
    }

    // 4. Check already placed blocks (overlap + break requirement)
    for (const b of placedBlocks) {
      const bSMs = new Date(b.start).getTime();
      const bEMs = new Date(b.end).getTime();

      // Direct overlap
      if (isOverlapping(sMs, eMs, bSMs, bEMs)) return false;

      // Break requirement on same calendar day
      if (getDateKey(start) === getDateKey(new Date(b.start))) {
        if (sMs >= bEMs && sMs - bEMs < breakMs) return false;
        if (bSMs >= eMs && bSMs - eMs < breakMs) return false;
      }
    }

    // 5. Daily study limit
    const dayKey = getDateKey(start);
    const currentDaily = dailyStudyMinutes.get(dayKey) || 0;
    if (currentDaily + prefs.blockMinutes > prefs.maxStudyMinutesPerDay) {
      return false;
    }

    return true;
  };

  const findAvailableSlot = (targetDay: Date, eventDeadline: Date): Date | null => {
    const candidateDays = [targetDay];

    // Try target day first, then adjacent days leading backwards toward now
    for (let offset = 1; offset <= 5; offset++) {
      const earlier = new Date(targetDay.getTime() - offset * 24 * 3600 * 1000);
      if (earlier >= now) candidateDays.push(earlier);
      const later = new Date(targetDay.getTime() + offset * 24 * 3600 * 1000);
      if (later < eventDeadline) candidateDays.push(later);
    }

    const { startH: bestStartH, endH: bestEndH } = getPreferredHours(prefs.bestTime);

    for (const day of candidateDays) {
      // First pass: Try preferred study time slots
      for (let h = bestStartH; h < bestEndH; h++) {
        for (let m = 0; m < 60; m += 30) {
          const candidateStart = new Date(day);
          candidateStart.setHours(h, m, 0, 0);
          const candidateEnd = new Date(candidateStart.getTime() + blockMs);

          if (isSlotValid(candidateStart, candidateEnd, eventDeadline)) {
            return candidateStart;
          }
        }
      }

      // Second pass: Try other daytime slots between 8 AM and 22 PM
      for (let h = 8; h < 22; h++) {
        if (h >= bestStartH && h < bestEndH) continue; // already checked
        for (let m = 0; m < 60; m += 30) {
          const candidateStart = new Date(day);
          candidateStart.setHours(h, m, 0, 0);
          const candidateEnd = new Date(candidateStart.getTime() + blockMs);

          if (isSlotValid(candidateStart, candidateEnd, eventDeadline)) {
            return candidateStart;
          }
        }
      }
    }

    return null;
  };

  // Schedule sessions for each academic event
  for (const event of relevantEvents) {
    const pendingTopics = request.topics.filter((t) => t.eventId === event.id && !t.isDone);
    const sessionsToSchedule: { kind: 'study' | 'revision'; topic?: string }[] = [];

    if (pendingTopics.length > 0) {
      for (const topic of pendingTopics) {
        sessionsToSchedule.push({ kind: 'study', topic: topic.text });
      }
      sessionsToSchedule.push({ kind: 'revision', topic: 'Full syllabus revision' });
    } else {
      sessionsToSchedule.push({ kind: 'study', topic: `${event.subject || 'Course'} deep study` });
      sessionsToSchedule.push({ kind: 'revision', topic: 'Practice & revision' });
    }

    // Schedule spaced days before the event
    const totalSessions = sessionsToSchedule.length;
    for (let i = 0; i < totalSessions; i++) {
      const session = sessionsToSchedule[i];
      // Spacing: Revision on day before, earlier study sessions 2 to 4 days before
      const daysBefore = session.kind === 'revision' ? 1 : Math.max(1, totalSessions - i + 1);
      const targetDay = new Date(event.startDate.getTime() - daysBefore * 24 * 3600 * 1000);

      const slotStart = findAvailableSlot(targetDay, event.startDate);
      if (slotStart) {
        const slotEnd = new Date(slotStart.getTime() + blockMs);
        const block: StudyBlock = {
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          kind: session.kind,
          subject: event.subject || event.title,
          topic: session.topic,
          eventId: event.id,
        };

        placedBlocks.push(block);
        const dayKey = getDateKey(slotStart);
        const currentDaily = dailyStudyMinutes.get(dayKey) || 0;
        dailyStudyMinutes.set(dayKey, currentDaily + prefs.blockMinutes);
      }
    }
  }

  // Sort blocks chronologically
  placedBlocks.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return { blocks: placedBlocks };
}
