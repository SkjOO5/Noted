import { convertDevanagari } from './hinglishNormalizer';

export type MsgType = 'quiz' | 'exam' | 'deadline' | 'assignment' | 'holiday' | 'room-change' | 'general';

export interface MessageClassification {
  type: MsgType;
  subject?: string;
  topic?: string;
  isImportant: boolean;
}

// Subject matchers with strict word boundary patterns
const SUBJECT_MATCHERS: { subject: string; pattern: RegExp }[] = [
  { subject: 'DBMS', pattern: /\b(dbms|database(?:\s+management(?:\s+systems?)?)?)\b/i },
  { subject: 'CN', pattern: /\b(cn|computer\s+networks?)\b/i },
  { subject: 'OS', pattern: /\b(os|operating\s+systems?)\b/i },
  { subject: 'DSA', pattern: /\b(dsa|data\s+structures?(?:\s+and\s+algorithms?)?)\b/i },
  { subject: 'Maths', pattern: /\b(maths?|mathematics)\b/i },
  { subject: 'English', pattern: /\b(english)\b/i },
];

function extractSubject(text: string): string | undefined {
  for (const { subject, pattern } of SUBJECT_MATCHERS) {
    if (pattern.test(text)) {
      return subject;
    }
  }
  return undefined;
}

function extractTopic(text: string): string | undefined {
  const parts: string[] = [];

  // Match Unit N or Unit N-M (e.g., "Unit 3", "unit 1-3", "Unit 2")
  const unitMatch = text.match(/\bunit\s*(\d+(?:\s*-\s*\d+)?)\b/i);
  if (unitMatch) {
    // Capitalize as "Unit X"
    parts.push(`Unit ${unitMatch[1]}`);
  }

  // Match Chapter N or Chapter N-M (e.g., "Chapter 5", "chapter 1-2")
  const chapMatch = text.match(/\bchapter\s*(\d+(?:\s*-\s*\d+)?)\b/i);
  if (chapMatch) {
    // Capitalize as "Chapter X"
    parts.push(`Chapter ${chapMatch[1]}`);
  }

  if (parts.length > 0) {
    return parts.join(', ');
  }

  return undefined;
}

export function classifyMessage(rawText: string): MessageClassification {
  if (!rawText || !rawText.trim()) {
    return {
      type: 'general',
      isImportant: false,
    };
  }

  const normalized = convertDevanagari(rawText.trim());

  // 1. Detect Subject
  const subject = extractSubject(normalized);

  // 2. Detect Topic
  const topic = extractTopic(normalized);

  // 3. Detect Message Type
  let type: MsgType = 'general';

  if (/\b(room\s*change|shifted\s+to\s+room|shifted\s+to|class\s+shifted)\b/i.test(normalized)) {
    type = 'room-change';
  } else if (/\b(holiday|chutti|no\s+class)\b/i.test(normalized)) {
    type = 'holiday';
  } else if (/\b(assignment|assignments|practical\s+file|file\s+jama)\b/i.test(normalized)) {
    type = 'assignment';
  } else if (/\b(last\s+date|deadline|deadlines|fee\s+submission|due\s+date)\b/i.test(normalized)) {
    type = 'deadline';
  } else if (/\b(mid\s*sems?|end\s*sems?|semesters?|exam|exams|timetable)\b/i.test(normalized)) {
    type = 'exam';
  } else if (/\b(quiz|quizzes|viva|test|tests)\b/i.test(normalized)) {
    type = 'quiz';
  }

  // 4. Determine Importance
  // Important if not general, or if topic/subject is detected, or if action-oriented academic keyword present
  let isImportant = false;
  if (type !== 'general' || topic !== undefined) {
    isImportant = true;
  }

  return {
    type,
    ...(subject ? { subject } : {}),
    ...(topic ? { topic } : {}),
    isImportant,
  };
}
