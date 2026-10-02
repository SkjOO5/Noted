import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { createReminder } from '@/db/reminderRepo';
import {
  checkAndFireDueReminders,
  snoozeReminder,
  markReminderDone,
  exportAllData,
  wipeAllData,
} from '../reminderScheduler';
import {
  getSettings,
  isQuietHoursActive,
} from '@/lib/settings/settingsManager';

describe('reminderScheduler and settingsManager', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('correctly calculates quiet hours', () => {
    const settings = {
      ...getSettings(),
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    };

    // 23:30 (11:30 PM) -> within quiet hours
    const lateNight = new Date(2026, 9, 12, 23, 30, 0);
    expect(isQuietHoursActive(lateNight, settings)).toBe(true);

    // 04:00 (4:00 AM) -> within quiet hours
    const earlyMorning = new Date(2026, 9, 13, 4, 0, 0);
    expect(isQuietHoursActive(earlyMorning, settings)).toBe(true);

    // 14:00 (2:00 PM) -> not in quiet hours
    const afternoon = new Date(2026, 9, 12, 14, 0, 0);
    expect(isQuietHoursActive(afternoon, settings)).toBe(false);
  });

  it('detects and marks due reminders as fired', async () => {
    const pastDate = new Date(Date.now() - 10000);
    const futureDate = new Date(Date.now() + 100000);

    const id1 = await createReminder({
      title: 'Past Reminder',
      triggerAt: pastDate,
      status: 'pending',
    });

    const id2 = await createReminder({
      title: 'Future Reminder',
      triggerAt: futureDate,
      status: 'pending',
    });

    const fired = await checkAndFireDueReminders();
    expect(fired.length).toBe(1);
    expect(fired[0].id).toBe(id1);

    const rem1 = await db.reminders.get(id1);
    expect(rem1?.status).toBe('fired');

    const rem2 = await db.reminders.get(id2);
    expect(rem2?.status).toBe('pending');
  });

  it('handles snooze duration properly', async () => {
    const id = await createReminder({
      title: 'Snooze Me',
      triggerAt: new Date(),
      status: 'pending',
    });

    await snoozeReminder(id, 10); // 10 minutes

    const rem = await db.reminders.get(id);
    expect(rem?.status).toBe('snoozed');
    expect(rem?.snoozeUntil).toBeDefined();
    expect(rem?.snoozeUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it('marks reminder done', async () => {
    const id = await createReminder({
      title: 'Finish Me',
      triggerAt: new Date(),
      status: 'pending',
    });

    await markReminderDone(id);

    const rem = await db.reminders.get(id);
    expect(rem?.status).toBe('done');
  });

  it('exports and wipes all data safely', async () => {
    await db.groups.add({
      name: 'Test Group',
      lastMessageAt: new Date(),
      unreadCount: 0,
    });

    const exportedJson = await exportAllData();
    expect(exportedJson).toContain('Test Group');

    await wipeAllData();
    const groupsAfterWipe = await db.groups.toArray();
    expect(groupsAfterWipe.length).toBe(0);
  });
});
