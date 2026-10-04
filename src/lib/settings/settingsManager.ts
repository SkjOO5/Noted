import type { StudyPreferences } from '@/lib/planner/types';
import { DEFAULT_STUDY_PREFERENCES } from '@/lib/planner/types';

export interface AppSettings {
  defaultQuizOffsets: number[]; // in minutes, e.g. [1440, 60]
  defaultOtherOffsets: number[]; // in minutes, e.g. [60]
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "07:00"
  theme: 'dark' | 'light' | 'system';
  studyPreferences: StudyPreferences;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultQuizOffsets: [1440, 60], // 1 day, 1 hour
  defaultOtherOffsets: [60], // 1 hour
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  theme: 'dark',
  studyPreferences: DEFAULT_STUDY_PREFERENCES,
};

const STORAGE_KEY = 'whatsapptext_settings_v1';

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to persist settings:', err);
  }
  return updated;
}

export function isQuietHoursActive(now: Date = new Date(), settings: AppSettings = getSettings()): boolean {
  if (!settings.quietHoursEnabled) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = settings.quietHoursStart.split(':').map(Number);
  const [endH, endM] = settings.quietHoursEnd.split(':').map(Number);

  const startMinutes = (startH || 0) * 60 + (startM || 0);
  const endMinutes = (endH || 0) * 60 + (endM || 0);

  if (startMinutes <= endMinutes) {
    // e.g. 01:00 to 06:00
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight e.g. 22:00 to 07:00
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}
