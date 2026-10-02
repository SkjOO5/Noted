import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import type { Message } from '@/db/db';
import { Calendar, FileText, Bell, CheckCheck, MoreVertical } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  onSwipeRight: (message: Message) => void; // Calendar
  onSwipeLeft: (message: Message) => void; // Notes
  onLongPress: (message: Message) => void; // Remind me
}

const SWIPE_THRESHOLD = 75;

export function MessageBubble({
  message,
  onSwipeRight,
  onSwipeLeft,
  onLongPress,
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const x = useMotionValue(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);

  // Background opacity and scale transforms based on swipe drag
  const rightOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const leftOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const handleDragStart = () => {
    isDragging.current = true;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    isDragging.current = false;
    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwipeRight(message);
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwipeLeft(message);
    }
    // Snap back to center
    animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
  };

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      if (!isDragging.current) {
        onLongPress(message);
      }
    }, 550);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const formatTime = (d: Date) => {
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Color mapping for chips
  const getChipStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case 'quiz':
        return { bg: 'rgba(255, 107, 107, 0.15)', text: 'var(--color-quiz)', border: 'rgba(255, 107, 107, 0.3)' };
      case 'assignment':
        return { bg: 'rgba(78, 205, 196, 0.15)', text: 'var(--color-assignment)', border: 'rgba(78, 205, 196, 0.3)' };
      case 'exam':
        return { bg: 'rgba(255, 230, 109, 0.15)', text: 'var(--color-exam)', border: 'rgba(255, 230, 109, 0.3)' };
      case 'room-change':
      case 'class-change':
        return { bg: 'rgba(167, 139, 250, 0.15)', text: 'var(--color-class-change)', border: 'rgba(167, 139, 250, 0.3)' };
      case 'holiday':
        return { bg: 'rgba(37, 211, 102, 0.15)', text: 'var(--color-accent)', border: 'rgba(37, 211, 102, 0.3)' };
      case 'deadline':
        return { bg: 'rgba(255, 107, 107, 0.15)', text: 'var(--color-quiz)', border: 'rgba(255, 107, 107, 0.3)' };
      default:
        return { bg: 'var(--color-elevated)', text: 'var(--color-muted)', border: 'var(--color-border)' };
    }
  };

  return (
    <div className="relative overflow-hidden my-1.5 select-none touch-pan-y">
      {/* Underlay Left (Revealed on Swipe Right -> Add to Calendar) */}
      <motion.div
        style={{ opacity: rightOpacity }}
        className="absolute inset-y-0 left-0 w-1/2 flex items-center pl-4 bg-[var(--color-accent)]/20 rounded-xl text-[var(--color-accent)] font-semibold text-xs gap-2 z-0"
      >
        <Calendar size={18} strokeWidth={2} />
        <span>Add to Calendar</span>
      </motion.div>

      {/* Underlay Right (Revealed on Swipe Left -> Save to Notes) */}
      <motion.div
        style={{ opacity: leftOpacity }}
        className="absolute inset-y-0 right-0 w-1/2 flex items-center justify-end pr-4 bg-[var(--color-assignment)]/20 rounded-xl text-[var(--color-assignment)] font-semibold text-xs gap-2 z-0"
      >
        <span>Save to Notes</span>
        <FileText size={18} strokeWidth={2} />
      </motion.div>

      {/* Foreground Swipeable Card */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        className="relative z-10 flex flex-col p-3 rounded-xl border bg-[var(--color-elevated)] border-[var(--color-border)] shadow-xs transition-colors hover:border-[var(--color-border)]/80"
      >
        {/* Header: Sender & Action Menu */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--color-accent)]">
              {message.sender}
            </span>
            {message.isImportant && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-quiz)] shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Status indicators */}
            {message.calendarEventId && (
              <span
                title="Event created in Calendar"
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
              >
                <Calendar size={11} />
                <span>Event</span>
              </span>
            )}
            {message.noteId && (
              <span
                title="Saved to Notes"
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-assignment)]/15 text-[var(--color-assignment)]"
              >
                <FileText size={11} />
                <span>Note</span>
              </span>
            )}

            {/* Overflow button for mouse / accessibility */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1 rounded text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                style={{ minHeight: '32px', minWidth: '32px' }}
                aria-label="Message options"
              >
                <MoreVertical size={16} />
              </button>

              {showMenu && (
                <div
                  className="absolute right-0 top-8 z-30 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl py-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onSwipeRight(message);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors text-left"
                    style={{ minHeight: '36px' }}
                  >
                    <Calendar size={14} className="text-[var(--color-accent)]" />
                    Add to Calendar
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onSwipeLeft(message);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors text-left"
                    style={{ minHeight: '36px' }}
                  >
                    <FileText size={14} className="text-[var(--color-assignment)]" />
                    Save to Notes
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onLongPress(message);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors text-left"
                    style={{ minHeight: '36px' }}
                  >
                    <Bell size={14} className="text-[var(--color-exam)]" />
                    Remind Me
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message Text */}
        <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap break-words leading-relaxed">
          {message.text}
        </p>

        {/* Category & Academic Chips */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {message.chips.map((chip, idx) => {
            const style = getChipStyle(chip);
            return (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border"
                style={{
                  backgroundColor: style.bg,
                  color: style.text,
                  borderColor: style.border,
                }}
              >
                {chip}
              </span>
            );
          })}

          {message.subject && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--color-border)]/60 text-[var(--color-text)] border border-[var(--color-border)]">
              {message.subject}
            </span>
          )}

          {message.topic && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--color-border)]/60 text-[var(--color-text)] border border-[var(--color-border)]">
              {message.topic}
            </span>
          )}

          {/* Time & Double Checkmark */}
          <div className="ml-auto flex items-center gap-1 text-[11px] text-[var(--color-muted)] shrink-0 self-end">
            <span>{formatTime(message.timestamp)}</span>
            <CheckCheck size={14} className="text-[var(--color-accent)]" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
