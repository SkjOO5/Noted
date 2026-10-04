import { useState, useEffect, useRef } from 'react';
import { BottomSheet } from '@/components/BottomSheet';
import {
  getSettings,
  saveSettings,
  type AppSettings,
} from '@/lib/settings/settingsManager';
import {
  hasNotificationPermission,
  requestNotificationPermission,
  exportAllData,
  downloadDataBackup,
  wipeAllData,
  importAllData,
} from '@/lib/remind/reminderScheduler';
import { seedSampleData } from '@/lib/seed/seedData';
import { useInstallPrompt } from '@/lib/pwa/useInstallPrompt';
import { useToast } from '@/components/ToastContext';
import {
  Bell,
  Moon,
  Download,
  Upload,
  Trash2,
  ShieldCheck,
  Check,
  AlertTriangle,
  Sparkles,
  Smartphone,
  BookOpen,
} from 'lucide-react';
import { TimetableModal } from '@/features/plan/TimetableModal';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsSheet({ isOpen, onClose }: SettingsSheetProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isInstallable, isInstalled, triggerInstall } = useInstallPrompt();

  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [hasNotifPerm, setHasNotifPerm] = useState(false);
  const [isWipeConfirmOpen, setIsWipeConfirmOpen] = useState(false);
  const [isTimetableOpen, setIsTimetableOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getSettings());
      hasNotificationPermission().then(setHasNotifPerm);
    }
  }, [isOpen]);

  const handleUpdate = (updates: Partial<AppSettings>) => {
    const updated = saveSettings(updates);
    setSettings(updated);
  };

  const handleUpdateStudyPrefs = (partial: Partial<AppSettings['studyPreferences']>) => {
    const current = settings.studyPreferences || getSettings().studyPreferences;
    handleUpdate({
      studyPreferences: {
        ...current,
        ...partial,
      },
    });
  };

  const handleInstallApp = async () => {
    const success = await triggerInstall();
    if (success) {
      showToast({ message: 'App installed successfully!' });
    }
  };

  const handleRequestNotifications = async () => {
    const granted = await requestNotificationPermission();
    setHasNotifPerm(granted);
    if (granted) {
      showToast({ message: 'Notifications enabled!' });
    } else {
      showToast({ message: 'Notification permission was not granted' });
    }
  };

  const handleExport = async () => {
    try {
      const json = await exportAllData();
      const dateStr = new Date().toISOString().split('T')[0];
      downloadDataBackup(json, `whatsapptext-backup-${dateStr}.json`);
      showToast({ message: 'Backup downloaded successfully' });
    } catch {
      showToast({ message: 'Failed to export backup' });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const res = await importAllData(text);
      if (res.success) {
        showToast({
          message: `Imported ${res.counts.messages || 0} messages, ${res.counts.events || 0} events, ${res.counts.notes || 0} notes!`,
        });
        setSettings(getSettings());
        onClose();
      }
    } catch (err: any) {
      showToast({ message: err?.message || 'Failed to import backup data' });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleWipeData = async () => {
    await wipeAllData();
    setIsWipeConfirmOpen(false);
    showToast({ message: 'All local data has been wiped' });
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Settings & privacy">
      <div className="flex flex-col gap-4 py-1">
        {/* Privacy Highlight */}
        <div className="flex items-start gap-3 p-3.5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] text-[#0B141A] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <ShieldCheck size={18} strokeWidth={2.2} />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-[13px] font-semibold text-[var(--color-text)]">
              100% On-device & private
            </p>
            <p className="text-[12px] font-normal text-[var(--color-muted)] leading-relaxed">
              Noted never uses external servers, cloud databases, or tracking. All chats, events, and notes stay purely on your device.
            </p>
          </div>
        </div>

        {/* App Installation Section */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
            App installation
          </label>
          <div className="flex items-center justify-between p-3.5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-elevated)] text-[var(--color-accent)] border border-[var(--color-border)] flex items-center justify-center shrink-0 shadow-xs">
                <Smartphone size={16} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[var(--color-text)]">
                  Desktop & Mobile App
                </p>
                <p className="text-[12px] font-normal text-[var(--color-muted)]">
                  {isInstalled
                    ? 'Installed as standalone app'
                    : isInstallable
                    ? 'Ready to install on this device'
                    : 'Use browser menu to "Add to Home Screen"'}
                </p>
              </div>
            </div>

            {isInstalled ? (
              <span className="flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full bg-[var(--color-accent-surface)] text-[var(--color-accent)] border border-[var(--color-accent-border)] shadow-xs">
                <Check size={14} strokeWidth={2.5} /> Installed
              </span>
            ) : isInstallable ? (
              <button
                onClick={handleInstallApp}
                className="btn btn-primary px-3.5 h-[36px] text-[12px] font-bold cursor-pointer"
              >
                Install
              </button>
            ) : null}
          </div>
        </div>

        {/* Notifications Section */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
            Notifications
          </label>
          <div className="flex items-center justify-between p-3.5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-elevated)] text-[var(--color-accent)] border border-[var(--color-border)] flex items-center justify-center shrink-0 shadow-xs">
                <Bell size={16} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[var(--color-text)]">
                  Browser push notifications
                </p>
                <p className="text-[12px] font-normal text-[var(--color-muted)]">
                  {hasNotifPerm ? 'Permission granted' : 'Disabled or not granted'}
                </p>
              </div>
            </div>

            {!hasNotifPerm ? (
              <button
                onClick={handleRequestNotifications}
                className="btn btn-primary px-3.5 h-[36px] text-[12px] font-bold cursor-pointer"
              >
                Enable
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full bg-[var(--color-accent-surface)] text-[var(--color-accent)] border border-[var(--color-accent-border)] shadow-xs">
                <Check size={14} strokeWidth={2.5} /> Active
              </span>
            )}
          </div>
        </div>

        {/* Quiet Hours Section */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
            Quiet hours (do not disturb)
          </label>
          <div className="flex flex-col gap-3 p-3.5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-elevated)] text-[var(--color-accent)] border border-[var(--color-border)] flex items-center justify-center shrink-0 shadow-xs">
                  <Moon size={16} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--color-text)]">
                    Mute notifications at night
                  </p>
                  <p className="text-[12px] font-normal text-[var(--color-muted)]">
                    Hold reminders until morning
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={settings.quietHoursEnabled}
                onChange={(e) => handleUpdate({ quietHoursEnabled: e.target.checked })}
                className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-accent)] accent-[var(--color-accent)] cursor-pointer"
              />
            </div>

            {settings.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-[var(--color-border)]">
                <div>
                  <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)] block mb-1">
                    Start time
                  </label>
                  <input
                    type="time"
                    value={settings.quietHoursStart}
                    onChange={(e) => handleUpdate({ quietHoursStart: e.target.value })}
                    className="w-full px-2.5 h-[36px] rounded-[var(--radius-button)] bg-[var(--color-elevated)] border border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] shadow-xs transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)] block mb-1">
                    End time
                  </label>
                  <input
                    type="time"
                    value={settings.quietHoursEnd}
                    onChange={(e) => handleUpdate({ quietHoursEnd: e.target.value })}
                    className="w-full px-2.5 h-[36px] rounded-[var(--radius-button)] bg-[var(--color-elevated)] border border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] shadow-xs transition-colors"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timetable Section */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
            Class Timetable
          </label>
          <div className="flex items-center justify-between p-3.5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-elevated)] text-[var(--color-accent)] border border-[var(--color-border)] flex items-center justify-center shrink-0 shadow-xs">
                <BookOpen size={16} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[var(--color-text)]">
                  Weekly Class Slots
                </p>
                <p className="text-[12px] font-normal text-[var(--color-muted)]">
                  Planner reserves class hours on your timetable
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsTimetableOpen(true)}
              className="btn btn-secondary px-3.5 h-[36px] text-[12px] font-bold cursor-pointer flex items-center gap-1.5"
            >
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Study & Planner Preferences */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
            Study & Planner Preferences
          </label>
          <div className="flex flex-col rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs text-[13px] divide-y divide-[var(--color-border)] overflow-hidden">
            {/* Best study time */}
            <div className="flex items-center justify-between p-3.5">
              <div>
                <div className="font-semibold text-[var(--color-text)]">Best study time</div>
                <div className="text-[12px] text-[var(--color-muted)]">Preferred hours for deep focus</div>
              </div>
              <select
                value={settings.studyPreferences?.bestTime || 'evening'}
                onChange={(e) =>
                  handleUpdateStudyPrefs({ bestTime: e.target.value as 'morning' | 'afternoon' | 'evening' })
                }
                className="px-2.5 h-[32px] rounded-[var(--radius-button)] bg-[var(--color-elevated)] border border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
              >
                <option value="morning">Morning (8 AM - 12 PM)</option>
                <option value="afternoon">Afternoon (1 PM - 5 PM)</option>
                <option value="evening">Evening (6 PM - 10 PM)</option>
              </select>
            </div>

            {/* Block Length */}
            <div className="flex items-center justify-between p-3.5">
              <div>
                <div className="font-semibold text-[var(--color-text)]">Session duration</div>
                <div className="text-[12px] text-[var(--color-muted)]">Target focus block length</div>
              </div>
              <select
                value={settings.studyPreferences?.blockMinutes || 45}
                onChange={(e) => handleUpdateStudyPrefs({ blockMinutes: Number(e.target.value) })}
                className="px-2.5 h-[32px] rounded-[var(--radius-button)] bg-[var(--color-elevated)] border border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
              >
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>60 mins</option>
              </select>
            </div>

            {/* Daily limit */}
            <div className="flex items-center justify-between p-3.5">
              <div>
                <div className="font-semibold text-[var(--color-text)]">Daily study limit</div>
                <div className="text-[12px] text-[var(--color-muted)]">Max study time per day</div>
              </div>
              <select
                value={settings.studyPreferences?.maxStudyMinutesPerDay || 240}
                onChange={(e) => handleUpdateStudyPrefs({ maxStudyMinutesPerDay: Number(e.target.value) })}
                className="px-2.5 h-[32px] rounded-[var(--radius-button)] bg-[var(--color-elevated)] border border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
              >
                <option value={120}>2 hours (120m)</option>
                <option value={180}>3 hours (180m)</option>
                <option value={240}>4 hours (240m)</option>
                <option value={360}>6 hours (360m)</option>
              </select>
            </div>

            {/* Break minutes */}
            <div className="flex items-center justify-between p-3.5">
              <div>
                <div className="font-semibold text-[var(--color-text)]">Break between blocks</div>
                <div className="text-[12px] text-[var(--color-muted)]">Buffer between sessions</div>
              </div>
              <select
                value={settings.studyPreferences?.breakMinutes || 15}
                onChange={(e) => handleUpdateStudyPrefs({ breakMinutes: Number(e.target.value) })}
                className="px-2.5 h-[32px] rounded-[var(--radius-button)] bg-[var(--color-elevated)] border border-[var(--color-border)] text-[12px] font-semibold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
              >
                <option value={10}>10 mins</option>
                <option value={15}>15 mins</option>
                <option value={20}>20 mins</option>
              </select>
            </div>

            {/* Sleep window */}
            <div className="flex items-center justify-between p-3.5">
              <div>
                <div className="font-semibold text-[var(--color-text)]">Sleep window</div>
                <div className="text-[12px] text-[var(--color-muted)]">No study blocks will be placed</div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--color-text)] font-semibold">
                <input
                  type="time"
                  value={settings.studyPreferences?.sleepStart || '23:00'}
                  onChange={(e) => handleUpdateStudyPrefs({ sleepStart: e.target.value })}
                  className="px-1.5 h-[28px] rounded bg-[var(--color-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text)]"
                />
                <span className="text-[var(--color-muted)]">–</span>
                <input
                  type="time"
                  value={settings.studyPreferences?.sleepEnd || '07:00'}
                  onChange={(e) => handleUpdateStudyPrefs({ sleepEnd: e.target.value })}
                  className="px-1.5 h-[28px] rounded bg-[var(--color-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text)]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Default Reminder Offsets */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
            Default reminder triggers
          </label>
          <div className="flex flex-col rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs text-[13px] divide-y divide-[var(--color-border)] overflow-hidden">
            <div className="flex items-center justify-between p-3.5">
              <span className="text-[var(--color-text)] font-semibold">Quizzes & exams</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[rgba(255,107,107,0.15)] text-[var(--color-quiz)] border border-[rgba(255,107,107,0.3)] shadow-xs font-semibold text-[11px]">1 day & 1 hr before</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <span className="text-[var(--color-text)] font-semibold">Assignments & deadlines</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[rgba(245,195,68,0.15)] text-[var(--color-exam)] border border-[rgba(245,195,68,0.3)] shadow-xs font-semibold text-[11px]">1 hr before</span>
            </div>
          </div>
        </div>

        {/* Backup & Data Management */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
            Backup & data sovereignty
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExport}
              className="btn btn-secondary h-[44px] text-[13px] font-bold flex items-center justify-center gap-2"
            >
              <Download size={16} strokeWidth={2} className="text-[var(--color-muted)] shrink-0" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary h-[44px] text-[13px] font-bold flex items-center justify-center gap-2"
            >
              <Upload size={16} strokeWidth={2} className="text-[var(--color-muted)] shrink-0" />
              <span>Import JSON</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>

          <button
            onClick={async () => {
              await seedSampleData();
              showToast({ message: 'Loaded sample college dataset!' });
              onClose();
            }}
            className="btn btn-primary h-[44px] text-[13px] font-bold mt-1 flex items-center justify-center gap-2"
          >
            <Sparkles size={16} strokeWidth={2} className="shrink-0" />
            <span>Load sample dataset</span>
          </button>

          {/* Wipe Data Button */}
          {!isWipeConfirmOpen ? (
            <button
              onClick={() => setIsWipeConfirmOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 h-[44px] mt-1 rounded-[var(--radius-button)] bg-[var(--color-surface)] border border-[var(--color-danger)]/50 hover:bg-[var(--color-danger-surface)] text-[var(--color-danger)] font-semibold text-[13px] shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Trash2 size={16} strokeWidth={2} />
              <span>Wipe all data</span>
            </button>
          ) : (
            <div className="flex flex-col gap-2.5 p-3.5 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-danger)]/50 shadow-xs mt-1">
              <div className="flex items-center gap-2 text-[var(--color-danger)] font-semibold text-[13px]">
                <AlertTriangle size={18} strokeWidth={2.5} className="text-[var(--color-danger)]" />
                <span>Delete everything permanently?</span>
              </div>
              <p className="text-[12px] font-normal text-[var(--color-muted)] leading-relaxed">
                This will permanently wipe all messages, events, notes, and reminders stored in this browser.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleWipeData}
                  className="flex-1 h-[40px] rounded-[var(--radius-button)] bg-[var(--color-danger)] hover:opacity-90 text-white text-[13px] font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  Yes, wipe all
                </button>
                <button
                  onClick={() => setIsWipeConfirmOpen(false)}
                  className="btn-secondary px-4 h-[40px] text-[13px] font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <TimetableModal isOpen={isTimetableOpen} onClose={() => setIsTimetableOpen(false)} />
    </BottomSheet>
  );
}
