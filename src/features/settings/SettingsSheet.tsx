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
} from 'lucide-react';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsSheet({ isOpen, onClose }: SettingsSheetProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [hasNotifPerm, setHasNotifPerm] = useState(false);
  const [isWipeConfirmOpen, setIsWipeConfirmOpen] = useState(false);

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
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Settings & Privacy">
      <div className="flex flex-col gap-5 py-2">
        {/* Privacy Highlight */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-accent)]/30">
          <ShieldCheck size={20} className="text-[var(--color-accent)] shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-bold text-[var(--color-text)]">
              100% On-Device & Private
            </p>
            <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
              WhatsAppText never uses external servers, cloud databases, or tracking. All chats, events, and notes stay in your browser IndexedDB.
            </p>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
            Notifications
          </label>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-elevated)] border border-[var(--color-border)]">
            <div className="flex items-center gap-2.5">
              <Bell size={18} className="text-[var(--color-accent)]" />
              <div>
                <p className="text-xs font-semibold text-[var(--color-text)]">
                  Browser Push Notifications
                </p>
                <p className="text-[11px] text-[var(--color-muted)]">
                  {hasNotifPerm ? 'Permission granted' : 'Disabled or not granted'}
                </p>
              </div>
            </div>

            {!hasNotifPerm ? (
              <button
                onClick={handleRequestNotifications}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-black text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                style={{ minHeight: '34px' }}
              >
                Enable
              </button>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold text-[var(--color-accent)]">
                <Check size={14} /> Active
              </span>
            )}
          </div>
        </div>

        {/* Quiet Hours Section */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
            Quiet Hours (Do Not Disturb)
          </label>
          <div className="flex flex-col gap-3 p-3 rounded-xl bg-[var(--color-elevated)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Moon size={18} className="text-[var(--color-muted)]" />
                <div>
                  <p className="text-xs font-semibold text-[var(--color-text)]">
                    Mute Notifications at Night
                  </p>
                  <p className="text-[11px] text-[var(--color-muted)]">
                    Hold reminders until morning
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={settings.quietHoursEnabled}
                onChange={(e) => handleUpdate({ quietHoursEnabled: e.target.checked })}
                className="w-5 h-5 rounded accent-[var(--color-accent)] cursor-pointer"
              />
            </div>

            {settings.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--color-border)]/50">
                <div>
                  <label className="text-[11px] text-[var(--color-muted)] block mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={settings.quietHoursStart}
                    onChange={(e) => handleUpdate({ quietHoursStart: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                    style={{ minHeight: '36px' }}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--color-muted)] block mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={settings.quietHoursEnd}
                    onChange={(e) => handleUpdate({ quietHoursEnd: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                    style={{ minHeight: '36px' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Default Reminder Offsets */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
            Default Reminder Triggers
          </label>
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-[var(--color-elevated)] border border-[var(--color-border)] text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text)] font-medium">Quizzes & Exams</span>
              <span className="text-[var(--color-accent)] font-semibold">1 day & 1 hour before</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border)]/40">
              <span className="text-[var(--color-text)] font-medium">Assignments & Others</span>
              <span className="text-[var(--color-accent)] font-semibold">1 hour before</span>
            </div>
          </div>
        </div>

        {/* Backup & Data Management */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
            Backup & Data Sovereignty
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-elevated)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors cursor-pointer"
              style={{ minHeight: '40px' }}
            >
              <Download size={14} className="text-[var(--color-accent)]" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-elevated)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors cursor-pointer"
              style={{ minHeight: '40px' }}
            >
              <Upload size={14} className="text-[var(--color-accent)]" />
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

          {/* Wipe Data Button */}
          {!isWipeConfirmOpen ? (
            <button
              onClick={() => setIsWipeConfirmOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 mt-1 rounded-xl bg-[var(--color-quiz)]/10 border border-[var(--color-quiz)]/30 text-xs font-semibold text-[var(--color-quiz)] hover:bg-[var(--color-quiz)]/20 transition-colors cursor-pointer"
              style={{ minHeight: '40px' }}
            >
              <Trash2 size={14} />
              <span>Wipe All Data</span>
            </button>
          ) : (
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-[var(--color-quiz)]/15 border border-[var(--color-quiz)]/40 mt-1">
              <div className="flex items-center gap-2 text-[var(--color-quiz)] font-bold text-xs">
                <AlertTriangle size={16} />
                <span>Delete everything permanently?</span>
              </div>
              <p className="text-[11px] text-[var(--color-muted)]">
                This will wipe all messages, events, notes, and reminders stored on this device.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleWipeData}
                  className="flex-1 py-1.5 rounded-lg bg-[var(--color-quiz)] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                  style={{ minHeight: '36px' }}
                >
                  Yes, Wipe Everything
                </button>
                <button
                  onClick={() => setIsWipeConfirmOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text)] font-semibold hover:bg-[var(--color-elevated)] transition-colors cursor-pointer"
                  style={{ minHeight: '36px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
