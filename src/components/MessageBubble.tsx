import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import type { Message } from '@/db/db';
import { Chip } from '@/components/Chip';
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
  const menuRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);

  // Close overflow menu on click outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Background opacity transforms based on swipe drag
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

  const mapChipType = (type: string): 'quiz' | 'assignment' | 'exam' | 'class-change' | 'other' | 'neutral' => {
    switch (type.toLowerCase()) {
      case 'quiz':
        return 'quiz';
      case 'assignment':
        return 'assignment';
      case 'exam':
        return 'exam';
      case 'room-change':
      case 'class-change':
        return 'class-change';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="relative overflow-hidden my-1 select-none touch-pan-y">
      {/* Underlay Left (Revealed on Swipe Right -> Add to Calendar) */}
      <motion.div
        style={{ opacity: rightOpacity }}
        className="absolute inset-y-0 left-0 w-1/2 flex items-center pl-4 bg-[var(--color-accent)] rounded-[var(--radius-card)] text-[#0B141A] font-semibold text-[12px] gap-2 z-0"
      >
        <Calendar size={18} strokeWidth={2} />
        <span>Add to Calendar</span>
      </motion.div>

      {/* Underlay Right (Revealed on Swipe Left -> Save to Notes) */}
      <motion.div
        style={{ opacity: leftOpacity }}
        className="absolute inset-y-0 right-0 w-1/2 flex items-center justify-end pr-4 bg-[var(--color-elevated)] border border-[var(--color-border)] rounded-[var(--radius-card)] text-[var(--color-text)] font-semibold text-[12px] gap-2 z-0"
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
        data-card="true"
        className="relative z-10 flex flex-col p-3.5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/40 transition-colors"
      >
        {/* Header: Sender & Action Menu */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-[var(--color-accent)]">
              {message.sender}
            </span>
            {message.isImportant && (
              <span className="px-1.5 py-0.5 rounded-full bg-[rgba(255,107,107,0.15)] text-[var(--color-quiz)] border border-[rgba(255,107,107,0.3)] text-[10px] font-semibold">
                Urgent
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Status indicators */}
            {message.calendarEventId && (
              <Chip
                label="Calendar"
                type="quiz"
                icon={<Calendar size={12} strokeWidth={2} />}
              />
            )}
            {message.noteId && (
              <Chip
                label="Note"
                type="assignment"
                icon={<FileText size={12} strokeWidth={2} />}
              />
            )}

            {/* Overflow button for mouse / accessibility */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="w-8 h-8 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors cursor-pointer flex items-center justify-center"
                aria-label="Message options"
              >
                <MoreVertical size={16} strokeWidth={1.75} />
              </button>

              {showMenu && (
                <div
                  className="absolute right-0 top-full mt-1 z-30 w-44 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md py-1 flex flex-col animate-in fade-in zoom-in-95 duration-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onSwipeRight(message);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] font-normal text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors text-left cursor-pointer"
                  >
                    <Calendar size={16} strokeWidth={1.75} className="text-[var(--color-accent)]" />
                    <span>Add to Calendar</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onSwipeLeft(message);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] font-normal text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors text-left cursor-pointer"
                  >
                    <FileText size={16} strokeWidth={1.75} className="text-[var(--color-assignment)]" />
                    <span>Save to Notes</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onLongPress(message);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] font-normal text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors text-left cursor-pointer"
                  >
                    <Bell size={16} strokeWidth={1.75} className="text-[var(--color-exam)]" />
                    <span>Remind Me</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message Text */}
        <p className="text-[14px] font-normal text-[var(--color-text)] whitespace-pre-wrap break-words leading-relaxed">
          {message.text}
        </p>

        {/* Category & Academic Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          {message.chips.map((chip, idx) => (
            <Chip
              key={idx}
              label={chip}
              type={mapChipType(chip)}
            />
          ))}

          {message.subject && (
            <Chip
              label={message.subject}
              type="neutral"
            />
          )}

          {message.topic && (
            <span className="text-[12px] font-normal text-[var(--color-muted)]">
              {message.topic}
            </span>
          )}

          {/* Time & Double Checkmark */}
          <div className="ml-auto flex items-center gap-1 text-[12px] font-normal text-[var(--color-muted)] shrink-0 self-end">
            <span>{formatTime(message.timestamp)}</span>
            <CheckCheck size={14} className="text-[var(--color-accent)]" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
