import type { ReactNode } from 'react';

export interface ChipProps {
  label: string;
  type?: 'quiz' | 'assignment' | 'exam' | 'class-change' | 'study' | 'other' | 'neutral' | 'event';
  icon?: ReactNode;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  quiz: {
    bg: 'rgba(255, 107, 107, 0.15)',
    text: '#FF6B6B',
    border: 'rgba(255, 107, 107, 0.35)',
  },
  assignment: {
    bg: 'rgba(83, 189, 235, 0.15)',
    text: '#53BDEB',
    border: 'rgba(83, 189, 235, 0.35)',
  },
  exam: {
    bg: 'rgba(245, 195, 68, 0.15)',
    text: '#F5C344',
    border: 'rgba(245, 195, 68, 0.35)',
  },
  'class-change': {
    bg: 'rgba(167, 139, 250, 0.15)',
    text: '#A78BFA',
    border: 'rgba(167, 139, 250, 0.35)',
  },
  study: {
    bg: 'rgba(37, 211, 102, 0.15)',
    text: '#25D366',
    border: 'rgba(37, 211, 102, 0.35)',
  },
  event: {
    bg: 'rgba(37, 211, 102, 0.15)',
    text: '#25D366',
    border: 'rgba(37, 211, 102, 0.35)',
  },
  other: {
    bg: 'rgba(134, 150, 160, 0.15)',
    text: '#8696A0',
    border: 'rgba(134, 150, 160, 0.30)',
  },
  neutral: {
    bg: 'rgba(134, 150, 160, 0.12)',
    text: '#8696A0',
    border: 'rgba(134, 150, 160, 0.25)',
  },
};

export function Chip({
  label,
  type = 'neutral',
  icon,
  count,
  active = false,
  onClick,
  className = '',
}: ChipProps) {
  const style = TYPE_STYLES[type] || TYPE_STYLES.neutral;

  if (active) {
    return (
      <span
        data-chip="true"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 h-6 px-2.5 text-[11px] font-semibold rounded-full leading-none whitespace-nowrap transition-colors select-none bg-[var(--color-accent)] text-[#0B141A] shadow-xs ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{label}</span>
        {count !== undefined && <span className="text-[10px] opacity-90 shrink-0 font-bold">{count}</span>}
      </span>
    );
  }

  return (
    <span
      data-chip="true"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-6 px-2.5 text-[11px] font-semibold rounded-full leading-none whitespace-nowrap transition-colors select-none ${
        onClick ? 'cursor-pointer hover:opacity-90' : ''
      } ${className}`}
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && <span className="text-[10px] opacity-75 shrink-0 font-medium">{count}</span>}
    </span>
  );
}
