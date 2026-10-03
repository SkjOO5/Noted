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
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Confirm event date">
      <div className="flex flex-col gap-3.5 py-1">
        <p className="text-[12px] font-normal text-[var(--color-muted)] leading-relaxed">
          The date in this message could refer to multiple dates (e.g. DD/MM vs MM/DD). Please select the intended date:
        </p>

        <div className="p-3.5 rounded-[var(--radius-card)] bg-[var(--color-elevated)] border border-[var(--color-border)] shadow-xs text-[13px] font-medium text-[var(--color-text)] italic">
          "{messageText}"
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => onSelect(option1)}
            className="flex items-center gap-3 p-3.5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-elevated)] active:scale-[0.98] transition-all text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)] text-[#0B141A] flex items-center justify-center shrink-0 shadow-xs">
              <Calendar size={18} strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
                {option1.label}
              </div>
              <div className="text-[13px] font-semibold text-[var(--color-text)] mt-0.5">
                {formatDate(option1.date, option1.timeConfirmed)}
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelect(option2)}
            className="flex items-center gap-3 p-3.5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-elevated)] active:scale-[0.98] transition-all text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-surface)] text-[var(--color-accent)] border border-[var(--color-accent-border)] flex items-center justify-center shrink-0 shadow-xs">
              <Calendar size={18} strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
                {option2.label}
              </div>
              <div className="text-[13px] font-semibold text-[var(--color-text)] mt-0.5">
                {formatDate(option2.date, option2.timeConfirmed)}
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="btn-secondary w-full h-[44px] text-[13px] font-bold mt-1"
        >
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
}
