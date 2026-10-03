import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

export interface ToastOptions {
  id?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setToast(options);

    const duration = options.durationMs ?? 4500;
    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-3 px-4 py-3 rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-lg animate-slide-up bg-[var(--color-elevated)] text-[var(--color-text)]"
          style={{
            maxWidth: 'calc(var(--max-content-width) - 32px)',
            width: 'calc(100% - 32px)',
          }}
        >
          <span className="text-[13px] font-medium truncate">{toast.message}</span>
          {toast.actionLabel && toast.onAction && (
            <button
              onClick={() => {
                toast.onAction?.();
                hideToast();
              }}
              className="text-[12px] font-bold px-3 py-1 rounded-full bg-[var(--color-accent)] text-[#0B141A] shadow-xs hover:bg-[var(--color-accent-hover)] active:scale-95 transition-all shrink-0 cursor-pointer h-[32px] flex items-center justify-center"
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
