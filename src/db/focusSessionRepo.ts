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

export async function deleteFocusSession(id: number): Promise<void> {
  await db.focusSessions.delete(id);
}

export async function cleanDemoFocusSessions(): Promise<void> {
  const demoTopics = [
    'ER Modeling & Relational Algebra',
    'TCP Handshake & Congestion Control',
    'Deadlock Detection & Semaphores',
    'Eigenvalues & Linear Transformations',
    'SQL Subqueries & Window Functions',
    'IP Subnetting & CIDR Calculations',
    'Binary Search Tree & AVL Rotations',
    'Process Scheduling Algorithms',
  ];
  await db.focusSessions
    .filter((s) => demoTopics.includes(s.topic || '') || demoTopics.includes(s.subject))
    .delete();
}

