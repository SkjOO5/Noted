import { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { Clock, Bell } from 'lucide-react';

interface ReminderSheetProps {
  isOpen: boolean;
  onClose: () => void;
  messageText: string;
  onSetReminder: (triggerAt: Date, label: string) => void;
}

export function ReminderSheet({
  isOpen,
  onClose,
  messageText,
  onSetReminder,
}: ReminderSheetProps) {
  const [customDateTime, setCustomDateTime] = useState<string>('');
  const [showCustom, setShowCustom] = useState<boolean>(false);

  const now = new Date();

  // 10 min from now
  const tenMin = new Date(now.getTime() + 10 * 60 * 1000);

  // 1 hour from now
  const oneHour = new Date(now.getTime() + 60 * 60 * 1000);

  // Tonight at 8:00 PM (or tomorrow 8:00 PM if already past 8 PM)
  const tonight = new Date(now);
  tonight.setHours(20, 0, 0, 0);
  if (now.getHours() >= 20) {
    tonight.setDate(tonight.getDate() + 1);
  }

  // Tomorrow morning at 9:00 AM
  const tomorrowMorning = new Date(now);
  tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
  tomorrowMorning.setHours(9, 0, 0, 0);

  const quickOptions = [
    { label: 'In 10 minutes', time: tenMin, subtext: tenMin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    { label: 'In 1 hour', time: oneHour, subtext: oneHour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    { label: 'Tonight (8:00 PM)', time: tonight, subtext: tonight.toLocaleDateString([], { weekday: 'short' }) + ' 8:00 PM' },
    { label: 'Tomorrow morning (9:00 AM)', time: tomorrowMorning, subtext: tomorrowMorning.toLocaleDateString([], { weekday: 'short' }) + ' 9:00 AM' },
  ];

  const handleCustomSubmit = () => {
    if (!customDateTime) return;
    const target = new Date(customDateTime);
    if (isNaN(target.getTime())) return;
    onSetReminder(target, 'Custom Reminder');
    setShowCustom(false);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Set a reminder">
      <div className="flex flex-col gap-3.5 py-1">
        <div className="p-3.5 rounded-[var(--radius-card)] bg-[var(--color-elevated)] border border-[var(--color-border)] shadow-xs text-[13px] font-medium text-[var(--color-text)] line-clamp-2 italic">
          "{messageText}"
        </div>

        {!showCustom ? (
          <div className="flex flex-col gap-2">
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden divide-y divide-[var(--color-border)]">
              {quickOptions.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => onSetReminder(opt.time, opt.label)}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-[var(--color-elevated)] transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-elevated)] text-[var(--color-accent)] border border-[var(--color-border)] flex items-center justify-center shrink-0 shadow-xs">
                      <Clock size={15} strokeWidth={2} />
                    </div>
                    <span className="text-[13px] font-semibold text-[var(--color-text)]">{opt.label}</span>
                  </div>
                  <span className="text-[12px] font-normal text-[var(--color-muted)]">{opt.subtext}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCustom(true)}
              className="btn-secondary h-[44px] mt-1 text-[13px] font-bold"
            >
              <Bell size={16} strokeWidth={2} className="text-[var(--color-muted)]" />
              <span>Custom date & time</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
              Select date & time
            </label>
            <input
              type="datetime-local"
              value={customDateTime}
              onChange={(e) => setCustomDateTime(e.target.value)}
              className="w-full px-3.5 h-[44px] rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-elevated)] text-[var(--color-text)] text-[13px] font-semibold focus:outline-none focus:border-[var(--color-accent)] shadow-xs transition-colors"
            />
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setShowCustom(false)}
                className="btn-secondary flex-1 h-[44px] text-[13px] font-bold"
              >
                Back
              </button>
              <button
                onClick={handleCustomSubmit}
                disabled={!customDateTime}
                className="btn-primary flex-1 h-[44px] text-[13px] font-bold cursor-pointer disabled:opacity-50"
              >
                Set reminder
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
