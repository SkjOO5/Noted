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
        className="w-full max-h-[85vh] flex flex-col rounded-t-2xl shadow-2xl overflow-hidden animate-slide-up"
        style={{
          maxWidth: 'var(--max-content-width)',
          backgroundColor: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle & Header */}
        <div className="flex flex-col px-4 pt-3 pb-2 border-b border-[var(--color-border)] shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border)] self-center mb-2" />
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--color-text)]">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[var(--color-elevated)] transition-colors text-[var(--color-muted)] hover:text-[var(--color-text)]"
              aria-label="Close"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              <X size={20} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
