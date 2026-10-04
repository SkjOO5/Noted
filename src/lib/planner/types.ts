export type EventKind = 'quiz' | 'assignment' | 'exam' | 'class-change' | 'study' | 'other';

export interface PlanEvent {
  id: number;
  kind: EventKind;
  subject?: string;
  title?: string;
  startAt: string; // ISO
  endAt?: string;  // ISO
}

export interface ClassSlot {
  id?: number;
  weekday: number; // 0=Sunday, 1=Monday..6=Saturday
  startMinute: number; // 0..1439 (e.g. 540 = 9:00 AM)
  endMinute: number;   // 0..1439 (e.g. 600 = 10:00 AM)
  subject?: string;
}

export interface PlanTopic {
  id?: number;
  eventId: number;
  text: string;
  isDone: boolean;
}

export interface StudyPreferences {
  sleepStart: string; // "23:00"
  sleepEnd: string;   // "07:00"
  maxStudyMinutesPerDay: number; // e.g. 240 (4 hours)
  blockMinutes: number; // e.g. 45
  bestTime: 'morning' | 'afternoon' | 'evening';
  breakMinutes: number; // e.g. 15
  bufferHoursBeforeDeadline: number; // e.g. 2
}

export const DEFAULT_STUDY_PREFERENCES: StudyPreferences = {
  sleepStart: '23:00',
  sleepEnd: '07:00',
  maxStudyMinutesPerDay: 240,
  blockMinutes: 45,
  bestTime: 'evening',
  breakMinutes: 15,
  bufferHoursBeforeDeadline: 2,
};

export interface PlanRequest {
  now: string; // ISO string
  horizonDays: number; // e.g. 7
  events: PlanEvent[];
  classes: ClassSlot[];
  topics: PlanTopic[];
  prefs: StudyPreferences;
}

export interface StudyBlock {
  start: string; // ISO
  end: string;   // ISO
  kind: 'study' | 'revision' | 'break' | 'buffer';
  subject?: string;
  topic?: string;
  eventId?: number;
}

export interface Plan {
  blocks: StudyBlock[];
}

export type ViolationRule =
  | 'overlap'
  | 'sleep_window'
  | 'class_conflict'
  | 'after_deadline'
  | 'daily_limit'
  | 'block_too_short'
  | 'break_violation'
  | 'uncovered_topic';

export interface PlanViolation {
  rule: ViolationRule;
  message: string;
  blockIndex?: number;
  eventId?: number;
  details?: Record<string, unknown>;
}
