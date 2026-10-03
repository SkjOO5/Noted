import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-h-[85vh] flex flex-col rounded-t-[20px] bg-[var(--color-surface)] border-t border-[var(--color-border)] shadow-2xl overflow-hidden animate-slide-up"
        style={{
          maxWidth: 'var(--max-w, 480px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle & Header */}
        <div className="flex flex-col px-5 pt-3 pb-3.5 border-b border-[var(--color-border)] shrink-0 bg-[var(--color-surface)]">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border)] self-center mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-[var(--color-text)] tracking-tight">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--color-elevated)] text-[var(--color-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)] transition-colors cursor-pointer flex items-center justify-center"
              aria-label="Close"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-[var(--color-surface)]">{children}</div>
      </div>
    </div>
  );
}
