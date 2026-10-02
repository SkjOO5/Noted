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
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Set a Reminder">
      <div className="flex flex-col gap-4">
        <div className="p-3 rounded-lg bg-[var(--color-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text)] line-clamp-2 italic">
          "{messageText}"
        </div>

        {!showCustom ? (
          <div className="flex flex-col gap-2">
            {quickOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => onSetReminder(opt.time, opt.label)}
                className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] transition-all cursor-pointer text-left"
                style={{ minHeight: '44px' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-elevated)] flex items-center justify-center text-[var(--color-accent)] shrink-0">
                    <Clock size={16} strokeWidth={1.75} />
                  </div>
                  <span className="text-sm font-medium text-[var(--color-text)]">{opt.label}</span>
                </div>
                <span className="text-xs text-[var(--color-muted)]">{opt.subtext}</span>
              </button>
            ))}

            <button
              onClick={() => setShowCustom(true)}
              className="flex items-center justify-center gap-2 p-3 mt-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] hover:border-[var(--color-accent)] text-sm font-medium text-[var(--color-text)] transition-colors cursor-pointer"
              style={{ minHeight: '44px' }}
            >
              <Bell size={16} strokeWidth={1.75} className="text-[var(--color-accent)]" />
              Pick Custom Date & Time
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
              Select date & time
            </label>
            <input
              type="datetime-local"
              value={customDateTime}
              onChange={(e) => setCustomDateTime(e.target.value)}
              className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-accent)]"
              style={{ minHeight: '44px' }}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setShowCustom(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                style={{ minHeight: '44px' }}
              >
                Back
              </button>
              <button
                onClick={handleCustomSubmit}
                disabled={!customDateTime}
                className="flex-1 py-2.5 rounded-xl bg-[var(--color-accent)] text-black font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                style={{ minHeight: '44px' }}
              >
                Set Reminder
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
