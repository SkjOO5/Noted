import { BottomSheet } from './BottomSheet';
import { Calendar } from 'lucide-react';

interface DateOption {
  label: string;
  date: Date;
  timeConfirmed: boolean;
}

interface AmbiguousDateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  messageText: string;
  option1: DateOption;
  option2: DateOption;
  onSelect: (option: DateOption) => void;
}

function formatDate(d: Date, timeConfirmed: boolean): string {
  const dateStr = d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  if (timeConfirmed) {
    const timeStr = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${dateStr} at ${timeStr}`;
  }
  return `${dateStr} (time unconfirmed)`;
}

export function AmbiguousDateSheet({
  isOpen,
  onClose,
  messageText,
  option1,
  option2,
  onSelect,
}: AmbiguousDateSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Confirm Event Date">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--color-muted)]">
          The date in this message could refer to multiple dates. Please select the intended date:
        </p>

        <div className="p-3 rounded-lg bg-[var(--color-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text)] italic">
          "{messageText}"
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => onSelect(option1)}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] transition-all text-left group cursor-pointer"
            style={{ minHeight: '44px' }}
          >
            <div className="w-10 h-10 rounded-full bg-[var(--color-elevated)] flex items-center justify-center text-[var(--color-accent)] shrink-0">
              <Calendar size={20} strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                {option1.label}
              </div>
              <div className="text-sm font-medium text-[var(--color-text)]">
                {formatDate(option1.date, option1.timeConfirmed)}
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelect(option2)}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] transition-all text-left group cursor-pointer"
            style={{ minHeight: '44px' }}
          >
            <div className="w-10 h-10 rounded-full bg-[var(--color-elevated)] flex items-center justify-center text-[var(--color-accent)] shrink-0">
              <Calendar size={20} strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                {option2.label}
              </div>
              <div className="text-sm font-medium text-[var(--color-text)]">
                {formatDate(option2.date, option2.timeConfirmed)}
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
          style={{ minHeight: '44px' }}
        >
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
}
