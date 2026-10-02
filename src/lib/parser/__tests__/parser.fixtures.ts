/**
 * WhatsAppText: parser fixtures for P2 (TDD).
 *
 * CONVENTIONS (the parser MUST follow these):
 * - REF = Wednesday 7 Oct 2026, 11:00 local time (Asia/Kolkata, no DST).
 *   Tests must pass `referenceDate = REF`, never rely on the real clock.
 * - All expected times are LOCAL, formatted 'YYYY-MM-DDTHH:mm'.
 * - No time in text  => 09:00 and timeConfirmed=false.
 * - Day-part words with no hour: subah/morning 09:00, dopahar/afternoon 13:00,
 *   shaam/evening 18:00, raat/night 21:00 (timeConfirmed=false).
 * - Bare hour heuristic (college hours): 1-6 => PM, 7-11 => AM, 12 => 12:00.
 *   An explicit am/pm or day-part word always wins ("raat 11 baje" => 23:00).
 * - sawa N => N:15, saadhe N => N:30, paune N => (N-1):45, dedh => 13:30,
 *   dhai => 14:30.
 * - Day/month order is DD/MM (chrono.en.GB). If both parts are <= 12 and the
 *   reading is ambiguous, return the alternate in `alternate`.
 * - Dates without a year use the current year. Never roll a past date into
 *   next year; return it with isPast=true.
 * - Time-only text ("at 3pm") means today if still ahead of REF, else tomorrow.
 * - Past-tense words (tha, thi, ho gaya, hua) make a relative date past-looking
 *   (isPast=true); the UI must not offer "Add to calendar" for these.
 */

export const REF = new Date(2026, 9, 7, 11, 0, 0); // Wed 7 Oct 2026 11:00

export interface ExpectedDate {
  start: string;
  end?: string;
  timeConfirmed: boolean;
  allDay?: boolean;
  isPast?: boolean;
}

export interface DateCase {
  id: string;
  input: string;
  results: ExpectedDate[]; // ordered; [] means "no date found"
  alternate?: string; // start of the second interpretation, if ambiguous
  firstOnly?: boolean; // only assert results[0]
}

export const dateCases: DateCase[] = [
  // ---------- Absolute dates ----------
  { id: 'abs-01', input: 'Assignment submission last date 18/10 5pm',
    results: [{ start: '2026-10-18T17:00', timeConfirmed: true }] },
  { id: 'abs-02', input: 'Quiz on 15 Oct',
    results: [{ start: '2026-10-15T09:00', timeConfirmed: false }] },
  { id: 'abs-03', input: 'Test on 15th October 2026 at 2pm',
    results: [{ start: '2026-10-15T14:00', timeConfirmed: true }] },
  { id: 'abs-04', input: 'Viva Oct 15 at 10am',
    results: [{ start: '2026-10-15T10:00', timeConfirmed: true }] },
  { id: 'abs-05', input: 'Submit by 20/10/2026 11:59pm',
    results: [{ start: '2026-10-20T23:59', timeConfirmed: true }] },
  { id: 'abs-06', input: 'Quiz 11/12',
    results: [{ start: '2026-12-11T09:00', timeConfirmed: false }],
    alternate: '2026-11-12T09:00' },
  { id: 'abs-07', input: 'Quiz was on 3 Oct',
    results: [{ start: '2026-10-03T09:00', timeConfirmed: false, isPast: true }] },

  // ---------- Relative English ----------
  { id: 'en-01', input: 'Quiz today at 4pm',
    results: [{ start: '2026-10-07T16:00', timeConfirmed: true }] },
  { id: 'en-02', input: 'Quiz tomorrow',
    results: [{ start: '2026-10-08T09:00', timeConfirmed: false }] },
  { id: 'en-03', input: 'Test day after tomorrow 11am',
    results: [{ start: '2026-10-09T11:00', timeConfirmed: true }] },
  { id: 'en-04', input: 'Lab viva next Monday 10am',
    results: [{ start: '2026-10-12T10:00', timeConfirmed: true }] },
  { id: 'en-05', input: 'Assignment due this Friday 5pm',
    results: [{ start: '2026-10-09T17:00', timeConfirmed: true }] },
  { id: 'en-06', input: 'Be there at 3pm',
    results: [{ start: '2026-10-07T15:00', timeConfirmed: true }] },
  { id: 'en-07', input: 'Class at 9am',
    results: [{ start: '2026-10-08T09:00', timeConfirmed: true }] }, // 9am already passed today

  // ---------- Hinglish (Roman) ----------
  { id: 'hi-01', input: 'kal 10 baje DBMS quiz, unit 3 tak',
    results: [{ start: '2026-10-08T10:00', timeConfirmed: true }] },
  { id: 'hi-02', input: 'parso se mid sems shuru, timetable attached',
    results: [{ start: '2026-10-09T09:00', timeConfirmed: false }] },
  { id: 'hi-03', input: 'agle somvar DBMS ka quiz hai, unit 1-3 tak padho',
    results: [{ start: '2026-10-12T09:00', timeConfirmed: false }] },
  { id: 'hi-04', input: 'is shanivar extra class hai 11 baje',
    results: [{ start: '2026-10-10T11:00', timeConfirmed: true }] },
  { id: 'hi-05', input: 'aaj shaam 6 baje OS ka test',
    results: [{ start: '2026-10-07T18:00', timeConfirmed: true }] },
  { id: 'hi-06', input: 'kal subah 8 baje CN lab',
    results: [{ start: '2026-10-08T08:00', timeConfirmed: true }] },
  { id: 'hi-07', input: 'kal raat 11 baje tak assignment submit karna hai',
    results: [{ start: '2026-10-08T23:00', timeConfirmed: true }] },
  { id: 'hi-08', input: 'parso saadhe 9 baje Maths ka test',
    results: [{ start: '2026-10-09T09:30', timeConfirmed: true }] },
  { id: 'hi-09', input: 'kal sawa 10 baje English quiz',
    results: [{ start: '2026-10-08T10:15', timeConfirmed: true }] },
  { id: 'hi-10', input: 'kal paune 12 baje DSA test',
    results: [{ start: '2026-10-08T11:45', timeConfirmed: true }] },
  { id: 'hi-11', input: 'aaj dedh baje Maths ki class hai',
    results: [{ start: '2026-10-07T13:30', timeConfirmed: true }] },
  { id: 'hi-12', input: 'kal 5 baje practical hai',
    results: [{ start: '2026-10-08T17:00', timeConfirmed: true }] }, // 5 => PM
  { id: 'hi-13', input: 'kal 8 baje exam hai',
    results: [{ start: '2026-10-08T08:00', timeConfirmed: true }] }, // 8 => AM
  { id: 'hi-14', input: 'kal 9 baje ghar se nikalna', // "se" must NOT break parsing
    results: [{ start: '2026-10-08T09:00', timeConfirmed: true }] },
  { id: 'hi-15', input: 'kal DBMS quiz, parso OS test',
    results: [
      { start: '2026-10-08T09:00', timeConfirmed: false },
      { start: '2026-10-09T09:00', timeConfirmed: false },
    ] },

  // ---------- Devanagari ----------
  { id: 'dv-01', input: 'कल सुबह ८ बजे DBMS क्विज़ है',
    results: [{ start: '2026-10-08T08:00', timeConfirmed: true }] },
  { id: 'dv-02', input: 'अगले सोमवार से परीक्षा शुरू',
    results: [{ start: '2026-10-12T09:00', timeConfirmed: false }] },

  // ---------- Ranges ----------
  { id: 'rg-01', input: 'kal 10 baje se 11 baje tak quiz',
    results: [{ start: '2026-10-08T10:00', end: '2026-10-08T11:00', timeConfirmed: true }] },
  { id: 'rg-02', input: 'Mid sems 12-16 Oct',
    results: [{ start: '2026-10-12T00:00', end: '2026-10-16T23:59', timeConfirmed: false, allDay: true }] },

  // ---------- Tense / corrections ----------
  { id: 'tn-01', input: 'kal quiz tha, kaisa gaya?',
    results: [{ start: '2026-10-06T09:00', timeConfirmed: false, isPast: true }] },
  { id: 'tn-02', input: 'kal ka quiz postpone ho gaya, ab parso hoga',
    results: [{ start: '2026-10-09T09:00', timeConfirmed: false }], firstOnly: true },

  // ---------- Negative / edge ----------
  { id: 'ng-01', input: 'Good morning everyone', results: [] },
  { id: 'ng-02', input: 'Reminder: 3 quizzes this month', results: [] },
  { id: 'ng-03', input: 'kal kal kal quiz hai kal',
    results: [{ start: '2026-10-08T09:00', timeConfirmed: false }] }, // dedupe
  { id: 'ng-04', input: '', results: [] },
];

// ---------------------------------------------------------------------------
// Classifier fixtures
// ---------------------------------------------------------------------------

export type MsgType = 'quiz' | 'exam' | 'deadline' | 'assignment' | 'holiday' | 'room-change' | 'general';

export interface ClassifierCase {
  id: string;
  input: string;
  type: MsgType;
  subject?: string;
  topic?: string;
  isImportant: boolean;
}

export const classifierCases: ClassifierCase[] = [
  { id: 'cl-01', input: 'kal 10 baje DBMS quiz, unit 3 tak', type: 'quiz', subject: 'DBMS', topic: 'Unit 3', isImportant: true },
  { id: 'cl-02', input: 'parso se mid sems shuru, timetable attached', type: 'exam', isImportant: true },
  { id: 'cl-03', input: 'Assignment submission last date 18/10 5pm', type: 'assignment', isImportant: true },
  { id: 'cl-04', input: 'Last date for fee submission is 20th', type: 'deadline', isImportant: true },
  { id: 'cl-05', input: 'Holiday tomorrow, no class', type: 'holiday', isImportant: true },
  { id: 'cl-06', input: 'kal chutti hai', type: 'holiday', isImportant: true },
  { id: 'cl-07', input: 'Room change: DBMS lecture shifted to Room 204', type: 'room-change', subject: 'DBMS', isImportant: true },
  { id: 'cl-08', input: 'CN viva on Monday', type: 'quiz', subject: 'CN', isImportant: true },
  { id: 'cl-09', input: 'Practical file jama karni hai Friday tak', type: 'assignment', isImportant: true },
  { id: 'cl-10', input: 'Unit 2 aur chapter 5 tak aayega', type: 'general', topic: 'Unit 2, Chapter 5', isImportant: true },
  { id: 'cl-11', input: 'Data Structures ka test hai', type: 'quiz', subject: 'DSA', isImportant: true },
  { id: 'cl-12', input: 'Operating System assignment mil gayi?', type: 'assignment', subject: 'OS', isImportant: true },
  { id: 'cl-13', input: 'कल सुबह ८ बजे DBMS क्विज़ है', type: 'quiz', subject: 'DBMS', isImportant: true },
  // false-positive guards: subject codes need word boundaries
  { id: 'cl-14', input: 'Boss ne bola cost of printing zyada hai', type: 'general', isImportant: false },
  { id: 'cl-15', input: 'Good morning everyone', type: 'general', isImportant: false },
  { id: 'cl-16', input: 'Who is coming to canteen?', type: 'general', isImportant: false },
];