import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Reminder } from '@/db/db';

/**
 * Check if the app has notification permissions (on web or native Android/iOS)
 */
export async function checkNotificationPermissions(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      return status.display === 'granted';
    } catch (err) {
      console.warn('Native checkPermissions failed:', err);
      return false;
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission === 'granted';
  }

  return false;
}

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    } catch (err) {
      console.warn('Native requestPermissions failed:', err);
      return false;
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Schedule a native local notification for an upcoming reminder
 */
export async function scheduleNativeReminder(reminder: Reminder): Promise<void> {
  if (!reminder.id || !reminder.triggerAt) return;

  const triggerDate = new Date(reminder.triggerAt);
  if (triggerDate.getTime() <= Date.now()) return;

  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: reminder.id,
            title: reminder.title,
            body: 'Tap to view reminder in WhatsAppText',
            schedule: { at: triggerDate },
            sound: undefined,
            extra: {
              reminderId: reminder.id,
              eventId: reminder.eventId,
              messageId: reminder.messageId,
            },
          },
        ],
      });
    } catch (err) {
      console.warn('Failed to schedule native local notification:', err);
    }
  }
}

/**
 * Cancel a scheduled native local notification
 */
export async function cancelNativeReminder(id: number): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.cancel({
        notifications: [{ id }],
      });
    } catch (err) {
      console.warn('Failed to cancel native local notification:', err);
    }
  }
}
