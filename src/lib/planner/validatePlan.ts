import type { PlanRequest, Plan, PlanViolation } from './types';

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

function blockIntersectsSleep(start: Date, end: Date, sleepStart: string, sleepEnd: string): boolean {
  const sleepStartMin = parseHHMM(sleepStart);
  const sleepEndMin = parseHHMM(sleepEnd);

  let t = start.getTime();
  const endMs = end.getTime();
  while (t < endMs) {
    const d = new Date(t);
    const m = d.getHours() * 60 + d.getMinutes();
    const inSleep =
      sleepStartMin <= sleepEndMin
        ? m >= sleepStartMin && m < sleepEndMin
        : m >= sleepStartMin || m < sleepEndMin;
    if (inSleep) return true;
    t += 15 * 60 * 1000;
  }

  const endCheck = new Date(endMs - 1000);
  const endM = endCheck.getHours() * 60 + endCheck.getMinutes();
  return sleepStartMin <= sleepEndMin
    ? endM >= sleepStartMin && endM < sleepEndMin
    : endM >= sleepStartMin || endM < sleepEndMin;
}

export function validatePlan(request: PlanRequest, plan: Plan): PlanViolation[] {
  const violations: PlanViolation[] = [];
  const blocks = plan.blocks;
  const prefs = request.prefs;
  const bufferMs = (prefs.bufferHoursBeforeDeadline || 0) * 3600 * 1000;
  const eventMap = new Map(request.events.map((e) => [e.id, e]));

  // 1. Overlap between blocks
  for (let i = 0; i < blocks.length; i++) {
    const aStart = new Date(blocks[i].start).getTime();
    const aEnd = new Date(blocks[i].end).getTime();

    if (aEnd <= aStart) {
      violations.push({
        rule: 'block_too_short',
        message: `Block ${i} end time is before or equal to start time`,
        blockIndex: i,
      });
      continue;
    }

    for (let j = i + 1; j < blocks.length; j++) {
      const bStart = new Date(blocks[j].start).getTime();
      const bEnd = new Date(blocks[j].end).getTime();

      if (aStart < bEnd && bStart < aEnd) {
        violations.push({
          rule: 'overlap',
          message: `Block ${i} (${blocks[i].subject || 'Study'}) overlaps with block ${j} (${blocks[j].subject || 'Study'})`,
          blockIndex: i,
          details: { overlappingWith: j },
        });
      }
    }
  }

  // 2. Individual block validations
  const dailyStudyMinutes = new Map<string, number>();

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const start = new Date(block.start);
    const end = new Date(block.end);
    const durationMinutes = (end.getTime() - start.getTime()) / (60 * 1000);

    // Rule: block_too_short
    if (block.kind === 'study' || block.kind === 'revision') {
      if (durationMinutes < prefs.blockMinutes) {
        violations.push({
          rule: 'block_too_short',
          message: `Block ${i} duration (${durationMinutes}m) is shorter than required blockMinutes (${prefs.blockMinutes}m)`,
          blockIndex: i,
        });
      }
    }

    // Rule: sleep_window
    if (blockIntersectsSleep(start, end, prefs.sleepStart, prefs.sleepEnd)) {
      violations.push({
        rule: 'sleep_window',
        message: `Block ${i} overlaps with student sleep window (${prefs.sleepStart} - ${prefs.sleepEnd})`,
        blockIndex: i,
      });
    }

    // Rule: class_conflict
    const weekday = start.getDay();
    const startMin = getMinuteOfDay(start);
    const endMin = getMinuteOfDay(end);
    const matchingClasses = request.classes.filter((c) => c.weekday === weekday);
    for (const cls of matchingClasses) {
      if (startMin < cls.endMinute && cls.startMinute < endMin) {
        violations.push({
          rule: 'class_conflict',
          message: `Block ${i} conflicts with scheduled class "${cls.subject || 'Class'}" (${cls.startMinute}m-${cls.endMinute}m)`,
          blockIndex: i,
          details: { classSubject: cls.subject, weekday },
        });
      }
    }

    // Rule: after_deadline
    if (block.eventId) {
      const event = eventMap.get(block.eventId);
      if (event) {
        const eventStartMs = new Date(event.startAt).getTime();
        if (end.getTime() > eventStartMs) {
          violations.push({
            rule: 'after_deadline',
            message: `Block ${i} ends after the deadline/start of "${event.title || event.subject || 'Event'}"`,
            blockIndex: i,
            eventId: event.id,
          });
        } else if (end.getTime() > eventStartMs - bufferMs) {
          violations.push({
            rule: 'after_deadline',
            message: `Block ${i} violates the ${prefs.bufferHoursBeforeDeadline}h buffer before "${event.title || event.subject || 'Event'}"`,
            blockIndex: i,
            eventId: event.id,
          });
        }
      }
    }

    // Daily study accumulation
    if (block.kind === 'study' || block.kind === 'revision') {
      const dateKey = getDateKey(start);
      const current = dailyStudyMinutes.get(dateKey) || 0;
      dailyStudyMinutes.set(dateKey, current + durationMinutes);
    }
  }

  // 3. Rule: daily_limit
  for (const [dateKey, totalMinutes] of dailyStudyMinutes.entries()) {
    if (totalMinutes > prefs.maxStudyMinutesPerDay) {
      violations.push({
        rule: 'daily_limit',
        message: `Study duration on ${dateKey} (${totalMinutes}m) exceeds max allowed (${prefs.maxStudyMinutesPerDay}m)`,
        details: { dateKey, totalMinutes, maxMinutes: prefs.maxStudyMinutesPerDay },
      });
    }
  }

  // 4. Rule: break_violation
  const studyBlocks = blocks
    .filter((b) => b.kind === 'study' || b.kind === 'revision')
    .slice()
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  for (let i = 0; i < studyBlocks.length - 1; i++) {
    const curEnd = new Date(studyBlocks[i].end).getTime();
    const nextStart = new Date(studyBlocks[i + 1].start).getTime();

    if (nextStart >= curEnd) {
      const gapMinutes = (nextStart - curEnd) / (60 * 1000);
      if (gapMinutes < prefs.breakMinutes) {
        violations.push({
          rule: 'break_violation',
          message: `Gap between consecutive study blocks (${gapMinutes}m) is less than break requirement (${prefs.breakMinutes}m)`,
        });
      }
    }
  }

  // 5. Rule: uncovered_topic
  const academicEvents = request.events.filter(
    (e) => e.kind === 'quiz' || e.kind === 'exam' || e.kind === 'assignment'
  );

  for (const event of academicEvents) {
    const pendingTopics = request.topics.filter((t) => t.eventId === event.id && !t.isDone);
    if (pendingTopics.length > 0) {
      const hasBlock = blocks.some(
        (b) =>
          b.eventId === event.id &&
          (b.kind === 'study' || b.kind === 'revision') &&
          new Date(b.end).getTime() <= new Date(event.startAt).getTime()
      );

      if (!hasBlock) {
        violations.push({
          rule: 'uncovered_topic',
          message: `Event "${event.title || event.subject || 'Event'}" has ${pendingTopics.length} pending topics but no scheduled study block before the deadline`,
          eventId: event.id,
          details: { pendingTopicCount: pendingTopics.length },
        });
      }
    }
  }

  return violations;
}
