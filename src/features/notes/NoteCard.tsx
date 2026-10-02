import type { Note } from '@/db/db';
import { updateNote, deleteNote } from '@/db/noteRepo';
import { getEventById } from '@/db/eventRepo';
import { useLiveQuery } from '@/db/useLiveQuery';
import { useToast } from '@/components/ToastContext';
import {
  Pin,
  CheckSquare,
  Square,
  Copy,
  Edit2,
  Trash2,
  Calendar as CalendarIcon,
} from 'lucide-react';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
}

export function NoteCard({ note, onEdit }: NoteCardProps) {
  const { showToast } = useToast();

  const linkedEvent = useLiveQuery(
    () => (note.linkedEventId ? getEventById(note.linkedEventId) : undefined),
    [note.linkedEventId]
  );

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

  return (
    <div
      className={`p-3.5 rounded-xl border transition-all flex flex-col gap-2.5 ${
        note.isPinned
          ? 'bg-[var(--color-surface)] border-[var(--color-accent)]/50 shadow-xs'
          : 'bg-[var(--color-elevated)] border-[var(--color-border)] hover:border-[var(--color-border)]/80'
      }`}
    >
      {/* Header Row: Subject, Linked Event & Action Controls */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {note.subject ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30 truncate max-w-[180px]">
              {note.subject}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)]">
              General Note
            </span>
          )}

          {linkedEvent && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--color-quiz)]/15 text-[var(--color-quiz)] border border-[var(--color-quiz)]/30 truncate max-w-[150px]">
              <CalendarIcon size={10} />
              <span className="truncate">{linkedEvent.title}</span>
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleTogglePin}
            title={note.isPinned ? 'Unpin note' : 'Pin note'}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              note.isPinned
                ? 'text-[var(--color-accent)] hover:bg-[var(--color-surface)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
            }`}
            style={{ minHeight: '32px', minWidth: '32px' }}
            aria-label={note.isPinned ? 'Unpin note' : 'Pin note'}
          >
            <Pin size={14} className={note.isPinned ? 'fill-current' : ''} />
          </button>

          <button
            onClick={handleCopyText}
            title="Copy note"
            className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
            style={{ minHeight: '32px', minWidth: '32px' }}
            aria-label="Copy note"
          >
            <Copy size={14} />
          </button>

          <button
            onClick={() => onEdit(note)}
            title="Edit note"
            className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
            style={{ minHeight: '32px', minWidth: '32px' }}
            aria-label="Edit note"
          >
            <Edit2 size={14} />
          </button>

          <button
            onClick={handleDelete}
            title="Delete note"
            className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-quiz)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
            style={{ minHeight: '32px', minWidth: '32px' }}
            aria-label="Delete note"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Note Text */}
      {note.text && (
        <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap break-words leading-relaxed">
          {note.text}
        </p>
      )}

      {/* Syllabus / Checklist Section */}
      {checklistTotal > 0 && (
        <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]/70 mt-0.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--color-muted)]">
            <span className="flex items-center gap-1 uppercase tracking-wider">
              <CheckSquare size={12} className="text-[var(--color-accent)]" />
              Checklist
            </span>
            <span className="text-[var(--color-text)]">
              {checklistDone}/{checklistTotal} ({checklistPercent}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1 rounded-full bg-[var(--color-elevated)] overflow-hidden">
            <div
              className="h-full bg-[var(--color-accent)] transition-all duration-300"
              style={{ width: `${checklistPercent}%` }}
            />
          </div>

          {/* Checklist Items */}
          <div className="flex flex-col gap-1 pt-1">
            {note.checklist?.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleToggleChecklist(idx)}
                className="flex items-start gap-2 text-left text-xs py-1 px-1 rounded hover:bg-[var(--color-elevated)] transition-colors cursor-pointer group"
              >
                {item.done ? (
                  <CheckSquare
                    size={15}
                    className="text-[var(--color-accent)] shrink-0 mt-0.5"
                  />
                ) : (
                  <Square
                    size={15}
                    className="text-[var(--color-muted)] group-hover:text-[var(--color-text)] shrink-0 mt-0.5"
                  />
                )}
                <span
                  className={`leading-tight break-words ${
                    item.done
                      ? 'line-through text-[var(--color-muted)] opacity-70'
                      : 'text-[var(--color-text)]'
                  }`}
                >
                  {item.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer: Tags & Updated Timestamp */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--color-border)]/40 text-[11px] text-[var(--color-muted)]">
        <div className="flex flex-wrap items-center gap-1">
          {note.tags?.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-medium text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-1.5 py-0.5 rounded-md"
            >
              #{tag}
            </span>
          ))}
        </div>

        <span className="shrink-0 text-[10px]">
          {new Date(note.updatedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          })}
        </span>
      </div>
    </div>
  );
}
