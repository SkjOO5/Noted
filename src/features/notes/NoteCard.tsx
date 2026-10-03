import { useState, useRef, useEffect } from 'react';
import type { Note } from '@/db/db';
import { updateNote, deleteNote } from '@/db/noteRepo';
import { getEventById } from '@/db/eventRepo';
import { useLiveQuery } from '@/db/useLiveQuery';
import { useToast } from '@/components/ToastContext';
import { Chip } from '@/components/Chip';
import {
  Pin,
  CheckSquare,
  Square,
  Copy,
  Edit2,
  Trash2,
  MoreVertical,
  Calendar as CalendarIcon,
} from 'lucide-react';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
}

export function NoteCard({ note, onEdit }: NoteCardProps) {
  const { showToast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const linkedEvent = useLiveQuery(
    () => (note.linkedEventId ? getEventById(note.linkedEventId) : undefined),
    [note.linkedEventId]
  );

  // Close overflow menu on outside click
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleTogglePin = async () => {
    if (!note.id) return;
    const newPinned = !note.isPinned;
    await updateNote(note.id, { isPinned: newPinned });
    showToast({
      message: newPinned ? 'Pinned note to top' : 'Unpinned note',
    });
  };

  const handleToggleChecklist = async (index: number) => {
    if (!note.id || !note.checklist) return;
    const updated = note.checklist.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    );
    await updateNote(note.id, { checklist: updated });
  };

  const handleCopyText = async () => {
    setIsMenuOpen(false);
    try {
      let content = '';
      if (note.subject) content += `[${note.subject}]\n`;
      if (note.text) content += `${note.text}\n`;
      if (note.checklist && note.checklist.length > 0) {
        content += '\nChecklist:\n' + note.checklist.map((c) => `- [${c.done ? 'x' : ' '}] ${c.text}`).join('\n');
      }
      await navigator.clipboard.writeText(content.trim());
      showToast({ message: 'Note copied to clipboard' });
    } catch {
      showToast({ message: 'Failed to copy to clipboard' });
    }
  };

  const handleDelete = async () => {
    setIsMenuOpen(false);
    if (!note.id) return;
    const noteCopy = { ...note };
    await deleteNote(note.id);

    showToast({
      message: 'Note deleted',
      actionLabel: 'Undo',
      onAction: async () => {
        const { id, ...rest } = noteCopy;
        await updateNote(noteCopy.id!, rest);
      },
    });
  };

  const checklistTotal = note.checklist?.length || 0;
  const checklistDone = note.checklist?.filter((c) => c.done).length || 0;
  const checklistPercent = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
  const isLongText = (note.text?.length || 0) > 160 || (note.text?.split('\n').length || 0) > 3;

  return (
    <div
      data-card="true"
      className={`note-card bg-[var(--color-surface)] border rounded-[var(--radius-card)] p-3.5 flex flex-col gap-3 transition-colors ${
        note.isPinned
          ? 'border-[var(--color-accent)]/50'
          : 'border-[var(--color-border)]'
      }`}
    >
      {/* Header Row: Left (Subject + Event), Right (Pin + Overflow 3-dots) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
          {note.subject ? (
            <Chip label={note.subject} type="assignment" />
          ) : (
            <Chip label="General" type="neutral" />
          )}

          {linkedEvent && (
            <Chip
              label={linkedEvent.title}
              type="quiz"
              icon={<CalendarIcon size={12} strokeWidth={2} />}
            />
          )}
        </div>

        {/* Action Controls: Ghost Pin + Overflow 3-Dots Menu */}
        <div className="flex items-center gap-1 shrink-0 relative" ref={menuRef}>
          <button
            onClick={handleTogglePin}
            title={note.isPinned ? 'Unpin note' : 'Pin note'}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              note.isPinned
                ? 'text-[var(--color-accent)] bg-[var(--color-accent-surface)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)]'
            }`}
            aria-label={note.isPinned ? 'Unpin note' : 'Pin note'}
          >
            <Pin size={16} strokeWidth={2} className={note.isPinned ? 'fill-current' : ''} />
          </button>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title="More actions"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors cursor-pointer"
            aria-label="More actions"
            aria-expanded={isMenuOpen}
          >
            <MoreVertical size={16} strokeWidth={2} />
          </button>

          {/* Overflow Menu Dropdown */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 w-36 py-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-lg divide-y divide-[var(--color-border)]">
              <button
                onClick={handleCopyText}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors text-left cursor-pointer"
              >
                <Copy size={15} strokeWidth={1.75} className="text-[var(--color-muted)]" />
                <span>Copy</span>
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onEdit(note);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors text-left cursor-pointer"
              >
                <Edit2 size={15} strokeWidth={1.75} className="text-[var(--color-muted)]" />
                <span>Edit</span>
              </button>
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-surface)] transition-colors text-left cursor-pointer"
              >
                <Trash2 size={15} strokeWidth={1.75} className="text-[var(--color-danger)]" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Note Body Text */}
      {note.text && (
        <div className="text-[13px] font-normal text-[var(--color-text)] leading-relaxed break-words">
          <p className={!isExpanded && isLongText ? 'line-clamp-3' : 'whitespace-pre-wrap'}>
            {note.text}
          </p>
          {isLongText && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-1 text-[12px] font-semibold text-[var(--color-accent)] hover:underline cursor-pointer select-none"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Syllabus / Checklist Section */}
      {checklistTotal > 0 && (
        <div className="flex flex-col gap-2 pt-3 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--color-muted)]">
            <span className="uppercase tracking-[1.2px] text-[10px]">Checklist</span>
            <span>
              {checklistDone}/{checklistTotal}
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-[var(--color-elevated)] overflow-hidden">
            <div
              className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-200"
              style={{ width: `${checklistPercent}%` }}
            />
          </div>

          <div className="flex flex-col rounded-[8px] border border-[var(--color-border)] bg-[var(--color-elevated)]/40 divide-y divide-[var(--color-border)] overflow-hidden">
            {note.checklist?.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleToggleChecklist(idx)}
                className="w-full min-h-[40px] flex items-center gap-2.5 py-2 px-3 text-left hover:bg-[var(--color-elevated)] transition-colors cursor-pointer select-none"
              >
                {item.done ? (
                  <CheckSquare
                    size={16}
                    strokeWidth={2}
                    className="text-[var(--color-accent)] shrink-0"
                  />
                ) : (
                  <Square
                    size={16}
                    strokeWidth={1.75}
                    className="text-[var(--color-muted)] shrink-0"
                  />
                )}
                <span
                  className={`text-[13px] leading-normal break-words flex-1 ${
                    item.done
                      ? 'line-through text-[var(--color-muted)]'
                      : 'font-medium text-[var(--color-text)]'
                  }`}
                >
                  {item.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer: Tags (Left) & Date (Right) */}
      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[var(--color-border)] text-[11px] font-medium text-[var(--color-muted)]">
        <div className="flex flex-wrap items-center gap-1 min-w-0">
          {note.tags?.map((tag) => (
            <span key={tag} className="text-[var(--color-muted)]">
              #{tag.toLowerCase()}
            </span>
          ))}
        </div>

        <span className="shrink-0 whitespace-nowrap">
          {new Date(note.updatedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          })}
        </span>
      </div>
    </div>
  );
}
