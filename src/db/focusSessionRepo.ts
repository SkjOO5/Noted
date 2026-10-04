import { db, type FocusSession } from './db';

export async function addFocusSession(session: Omit<FocusSession, 'id'>): Promise<number> {
  return await db.focusSessions.add(session);
}

export async function getFocusSessions(): Promise<FocusSession[]> {
  return await db.focusSessions.orderBy('completedAt').reverse().toArray();
}

export async function getTodayFocusMinutes(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const sessions = await db.focusSessions
    .where('completedAt')
    .aboveOrEqual(startOfDay)
    .toArray();

  return sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
}

export interface DayFocusStat {
  dayLabel: string; // e.g. "Wed", "Thu", "Today"
  dateStr: string;
  minutes: number;
  isToday: boolean;
}

export async function getWeeklyFocusStats(): Promise<DayFocusStat[]> {
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const stats: DayFocusStat[] = [];

  // Generate 7 days ending with today (or centered on today)
  for (let i = 4; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);

    const isToday = i === 0;
    const dayLabel = isToday ? 'Today' : dayNames[d.getDay()];

    const sessions = await db.focusSessions
      .where('completedAt')
      .between(d, end, true, true)
      .toArray();

    const minutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);

    stats.push({
      dayLabel,
      dateStr: d.toISOString().split('T')[0],
      minutes,
      isToday,
    });
  }

  // Add 2 upcoming forecast days for nice curve matching TimePad design (Wed, Thu, Today, Sat, Sun)
  for (let i = 1; i <= 2; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    stats.push({
      dayLabel: dayNames[d.getDay()],
      dateStr: d.toISOString().split('T')[0],
      minutes: 0,
      isToday: false,
    });
  }

  return stats;
}

export async function seedSampleFocusSessions(): Promise<void> {
  const count = await db.focusSessions.count();
  if (count > 0) return;

  const now = new Date();
  const sampleSessions: Omit<FocusSession, 'id'>[] = [
    // Today
    {
      subject: 'DBMS',
      topic: 'ER Modeling & Relational Algebra',
      durationMinutes: 45,
      completedAt: new Date(now.getTime() - 1000 * 60 * 120),
    },
    {
      subject: 'Computer Networks',
      topic: 'TCP Handshake & Congestion Control',
      durationMinutes: 45,
      completedAt: new Date(now.getTime() - 1000 * 60 * 45),
    },
    {
      subject: 'Operating Systems',
      topic: 'Deadlock Detection & Semaphores',
      durationMinutes: 30,
      completedAt: new Date(now.getTime() - 1000 * 60 * 15),
    },
    // Yesterday
    {
      subject: 'Mathematics',
      topic: 'Eigenvalues & Linear Transformations',
      durationMinutes: 60,
      completedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24),
    },
    {
      subject: 'DBMS',
      topic: 'SQL Subqueries & Window Functions',
      durationMinutes: 45,
      completedAt: new Date(now.getTime() - 1000 * 60 * 60 * 26),
    },
    // 2 days ago
    {
      subject: 'Computer Networks',
      topic: 'IP Subnetting & CIDR Calculations',
      durationMinutes: 45,
      completedAt: new Date(now.getTime() - 1000 * 60 * 60 * 48),
    },
    // 3 days ago
    {
      subject: 'Data Structures',
      topic: 'Binary Search Tree & AVL Rotations',
      durationMinutes: 50,
      completedAt: new Date(now.getTime() - 1000 * 60 * 60 * 72),
    },
    // 4 days ago
    {
      subject: 'Operating Systems',
      topic: 'Process Scheduling Algorithms',
      durationMinutes: 40,
      completedAt: new Date(now.getTime() - 1000 * 60 * 60 * 96),
    },
  ];

  for (const s of sampleSessions) {
    await db.focusSessions.add(s);
  }
}
