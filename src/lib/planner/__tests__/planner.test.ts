import { describe, it, expect } from 'vitest';
import { validatePlan } from '../validatePlan';
import { greedyPlan } from '../greedyPlan';
import type { PlanRequest, Plan, StudyPreferences } from '../types';

const defaultPrefs: StudyPreferences = {
  sleepStart: '23:00',
  sleepEnd: '07:00',
  maxStudyMinutesPerDay: 240,
  blockMinutes: 45,
  bestTime: 'evening',
  breakMinutes: 15,
  bufferHoursBeforeDeadline: 2,
};

describe('validatePlan Rules', () => {
  // Use a base local date for reliable testing in any timezone
  const baseDate = new Date('2026-10-10T09:00:00');
  const nowIso = baseDate.toISOString();

  // Quiz on Oct 14 at 10:00 AM local
  const quizDate = new Date('2026-10-14T10:00:00');

  const baseRequest: PlanRequest = {
    now: nowIso,
    horizonDays: 7,
    events: [
      {
        id: 1,
        kind: 'quiz',
        subject: 'DBMS',
        title: 'DBMS Unit 3 Quiz',
        startAt: quizDate.toISOString(),
      },
    ],
    classes: [
      {
        id: 1,
        weekday: 1, // Monday
        startMinute: 600, // 10:00 AM
        endMinute: 660,   // 11:00 AM
        subject: 'OS Lecture',
      },
    ],
    topics: [
      { id: 101, eventId: 1, text: 'Indexing & B-Trees', isDone: false },
    ],
    prefs: defaultPrefs,
  };

  it('passes a fully valid plan with 0 violations', () => {
    // Session on Oct 11 from 18:00 to 18:45, break, then 19:00 to 19:45
    const s1 = new Date('2026-10-11T00:00:00');
    s1.setHours(18, 0, 0, 0);
    const e1 = new Date(s1.getTime() + 45 * 60 * 1000);

    const s2 = new Date('2026-10-11T00:00:00');
    s2.setHours(19, 0, 0, 0);
    const e2 = new Date(s2.getTime() + 45 * 60 * 1000);

    const validPlan: Plan = {
      blocks: [
        {
          start: s1.toISOString(),
          end: e1.toISOString(),
          kind: 'study',
          subject: 'DBMS',
          topic: 'Indexing & B-Trees',
          eventId: 1,
        },
        {
          start: s2.toISOString(),
          end: e2.toISOString(),
          kind: 'revision',
          subject: 'DBMS',
          topic: 'Practice questions',
          eventId: 1,
        },
      ],
    };

    const violations = validatePlan(baseRequest, validPlan);
    expect(violations).toEqual([]);
  });

  it('detects "overlap" between two study blocks', () => {
    const s1 = new Date('2026-10-11T00:00:00');
    s1.setHours(18, 0, 0, 0);
    const e1 = new Date(s1.getTime() + 60 * 60 * 1000);

    const s2 = new Date(s1.getTime() + 30 * 60 * 1000); // overlaps!
    const e2 = new Date(s2.getTime() + 60 * 60 * 1000);

    const plan: Plan = {
      blocks: [
        {
          start: s1.toISOString(),
          end: e1.toISOString(),
          kind: 'study',
          subject: 'DBMS',
        },
        {
          start: s2.toISOString(),
          end: e2.toISOString(),
          kind: 'study',
          subject: 'OS',
        },
      ],
    };

    const violations = validatePlan(baseRequest, plan);
    expect(violations.some((v) => v.rule === 'overlap')).toBe(true);
  });

  it('detects "sleep_window" violation when study is scheduled at night', () => {
    const lateNightDate = new Date('2026-10-11T00:00:00');
    lateNightDate.setHours(23, 30, 0, 0); // 23:30 local time (inside sleep 23:00 - 07:00)
    const endDate = new Date(lateNightDate.getTime() + 45 * 60 * 1000);

    const plan: Plan = {
      blocks: [
        {
          start: lateNightDate.toISOString(),
          end: endDate.toISOString(),
          kind: 'study',
          subject: 'DBMS',
        },
      ],
    };

    const violations = validatePlan(baseRequest, plan);
    expect(violations.some((v) => v.rule === 'sleep_window')).toBe(true);
  });

  it('detects "class_conflict" when study overlaps with scheduled timetable class', () => {
    // Oct 12, 2026 is Monday (weekday 1)
    const mondayClassOverlap = new Date('2026-10-12T00:00:00');
    mondayClassOverlap.setHours(10, 15, 0, 0); // Class is 10:00 to 11:00
    const endOverlap = new Date(mondayClassOverlap.getTime() + 45 * 60 * 1000);

    const plan: Plan = {
      blocks: [
        {
          start: mondayClassOverlap.toISOString(),
          end: endOverlap.toISOString(),
          kind: 'study',
          subject: 'DBMS',
        },
      ],
    };

    const violations = validatePlan(baseRequest, plan);
    expect(violations.some((v) => v.rule === 'class_conflict')).toBe(true);
  });

  it('detects "after_deadline" when study is scheduled after or inside buffer of event', () => {
    const eventTime = new Date(baseRequest.events[0].startAt).getTime();
    // 30 min before event (buffer is 2 hours)
    const blockEnd = new Date(eventTime - 30 * 60 * 1000);
    const blockStart = new Date(blockEnd.getTime() - 45 * 60 * 1000);

    const plan: Plan = {
      blocks: [
        {
          start: blockStart.toISOString(),
          end: blockEnd.toISOString(),
          kind: 'study',
          subject: 'DBMS',
          eventId: 1,
        },
      ],
    };

    const violations = validatePlan(baseRequest, plan);
    expect(violations.some((v) => v.rule === 'after_deadline')).toBe(true);
  });

  it('detects "daily_limit" when total study time exceeds max allowed', () => {
    const d = new Date('2026-10-11T00:00:00');
    // maxStudyMinutesPerDay is 240m (4 blocks of 60m). Add 5 blocks of 60m = 300m
    const blocks = [];
    for (let i = 0; i < 5; i++) {
      const start = new Date(d);
      start.setHours(12 + i * 2, 0, 0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      blocks.push({
        start: start.toISOString(),
        end: end.toISOString(),
        kind: 'study' as const,
        subject: 'DBMS',
      });
    }

    const violations = validatePlan(baseRequest, { blocks });
    expect(violations.some((v) => v.rule === 'daily_limit')).toBe(true);
  });

  it('detects "block_too_short" when session is shorter than blockMinutes', () => {
    const start = new Date('2026-10-11T00:00:00');
    start.setHours(18, 0, 0, 0);
    const end = new Date(start.getTime() + 20 * 60 * 1000); // 20m < 45m

    const plan: Plan = {
      blocks: [
        {
          start: start.toISOString(),
          end: end.toISOString(),
          kind: 'study',
          subject: 'DBMS',
        },
      ],
    };

    const violations = validatePlan(baseRequest, plan);
    expect(violations.some((v) => v.rule === 'block_too_short')).toBe(true);
  });

  it('detects "break_violation" between consecutive study blocks with insufficient gap', () => {
    const s1 = new Date('2026-10-11T00:00:00');
    s1.setHours(18, 0, 0, 0);
    const e1 = new Date(s1.getTime() + 45 * 60 * 1000);
    const s2 = new Date(e1.getTime() + 5 * 60 * 1000); // 5m gap < 15m break
    const e2 = new Date(s2.getTime() + 45 * 60 * 1000);

    const plan: Plan = {
      blocks: [
        {
          start: s1.toISOString(),
          end: e1.toISOString(),
          kind: 'study',
          subject: 'DBMS',
        },
        {
          start: s2.toISOString(),
          end: e2.toISOString(),
          kind: 'study',
          subject: 'DBMS',
        },
      ],
    };

    const violations = validatePlan(baseRequest, plan);
    expect(violations.some((v) => v.rule === 'break_violation')).toBe(true);
  });

  it('detects "uncovered_topic" when an event has pending topics but no scheduled study block', () => {
    const plan: Plan = {
      blocks: [], // Empty plan
    };

    const violations = validatePlan(baseRequest, plan);
    expect(violations.some((v) => v.rule === 'uncovered_topic')).toBe(true);
  });
});

describe('greedyPlan Generator', () => {
  it('generates a valid, spaced study plan that passes all validation rules', () => {
    const now = new Date();
    // Schedule quiz 4 days from now
    const quizDate = new Date(now.getTime() + 4 * 24 * 3600 * 1000);
    quizDate.setHours(14, 0, 0, 0);

    const request: PlanRequest = {
      now: now.toISOString(),
      horizonDays: 7,
      events: [
        {
          id: 1,
          kind: 'quiz',
          subject: 'DBMS',
          title: 'DBMS Midsem Quiz',
          startAt: quizDate.toISOString(),
        },
      ],
      classes: [
        {
          id: 1,
          weekday: 1, // Monday
          startMinute: 600,
          endMinute: 720,
          subject: 'Computer Networks',
        },
      ],
      topics: [
        { id: 1, eventId: 1, text: 'Relational Algebra', isDone: false },
        { id: 2, eventId: 1, text: 'SQL Joins', isDone: false },
      ],
      prefs: defaultPrefs,
    };

    const plan = greedyPlan(request);

    expect(plan.blocks.length).toBeGreaterThan(0);
    for (const block of plan.blocks) {
      expect(block.subject).toBe('DBMS');
      expect(new Date(block.start).getTime()).toBeLessThan(new Date(block.end).getTime());
    }

    // Validate generated plan against all rules
    const violations = validatePlan(request, plan);
    expect(violations).toEqual([]);
  });

  it('handles empty events gracefully', () => {
    const request: PlanRequest = {
      now: new Date().toISOString(),
      horizonDays: 7,
      events: [],
      classes: [],
      topics: [],
      prefs: defaultPrefs,
    };

    const plan = greedyPlan(request);
    expect(plan.blocks).toEqual([]);
  });

  it('getPlanWithFallback executes offline greedy plan when no URL is set', async () => {
    const { getPlanWithFallback } = await import('../cloudPlanner');
    const request: PlanRequest = {
      now: new Date().toISOString(),
      horizonDays: 7,
      events: [],
      classes: [],
      topics: [],
      prefs: defaultPrefs,
    };
    const res = await getPlanWithFallback(request);
    expect(res.source).toBe('greedy');
    expect(res.plan.blocks).toEqual([]);
    expect(res.violations).toEqual([]);
    expect(res.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('passes all standardized test cases in shared planner_test_cases.json', async () => {
    const { default: testCases } = await import('../../../../tests/fixtures/planner_test_cases.json');

    for (const tc of testCases) {
      const violations = validatePlan(tc.request as unknown as PlanRequest, tc.plan as unknown as Plan);
      const ruleNames = violations.map((v) => v.rule);

      for (const expectedRule of tc.expectedRules) {
        expect(ruleNames, `Case "${tc.name}" expected to include violation "${expectedRule}"`).toContain(expectedRule);
      }
      if (tc.expectedRules.length === 0) {
        expect(violations, `Case "${tc.name}" expected 0 violations`).toEqual([]);
      }
    }
  });
});
