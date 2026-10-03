import { useState, useEffect } from 'react';
import { BottomSheet } from '@/components/BottomSheet';
import type { Note } from '@/db/db';
import { createNote, updateNote } from '@/db/noteRepo';
import { getAllEvents } from '@/db/eventRepo';
import { useLiveQuery } from '@/db/useLiveQuery';
import { useToast } from '@/components/ToastContext';
import { Plus, Trash2, Pin, CheckSquare } from 'lucide-react';

interface AddNoteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  noteToEdit?: Note | null;
  defaultSubject?: string;
  onNoteSaved?: (noteId: number) => void;
}

export function AddNoteSheet({
  isOpen,
  onClose,
  noteToEdit,
  defaultSubject = '',
  onNoteSaved,
}: AddNoteSheetProps) {
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [subject, setSubject] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [checklist, setChecklist] = useState<{ text: string; done: boolean }[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [linkedEventId, setLinkedEventId] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const events = useLiveQuery(() => getAllEvents(), []) || [];

  useEffect(() => {
    if (noteToEdit) {
      setText(noteToEdit.text);
      setSubject(noteToEdit.subject || '');
      setIsPinned(noteToEdit.isPinned);
      setTags(noteToEdit.tags || []);
      setChecklist(noteToEdit.checklist || []);
      setLinkedEventId(noteToEdit.linkedEventId);
    } else {
      setText('');
      setSubject(defaultSubject);
      setIsPinned(false);
      setTags([]);
      setChecklist([]);
      setLinkedEventId(undefined);
    }
  }, [noteToEdit, defaultSubject, isOpen]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleAddChecklistItem = () => {
    const trimmed = newChecklistText.trim();
    if (trimmed) {
      setChecklist([...checklist, { text: trimmed, done: false }]);
      setNewChecklistText('');
    }
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && checklist.length === 0) return;

    try {
      setIsSubmitting(true);

      if (noteToEdit && noteToEdit.id) {
        await updateNote(noteToEdit.id, {
          text: text.trim(),
          subject: subject.trim() || undefined,
          isPinned,
          tags,
          checklist,
          linkedEventId,
        });

        showToast({ message: 'Note updated successfully' });
        onNoteSaved?.(noteToEdit.id);
      } else {
        const id = await createNote({
          text: text.trim(),
          subject: subject.trim() || undefined,
          isPinned,
          tags,
          checklist,
          linkedEventId,
        });

        showToast({ message: 'Note saved successfully' });
        onNoteSaved?.(id);
      }

      onClose();
    } catch (err) {
      console.error(err);
      showToast({ message: 'Failed to save note' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={noteToEdit ? 'Edit note' : 'New note'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 py-1">
        {/* Subject & Pin */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
              Subject (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. DBMS, Operating Systems"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 h-[44px] rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-elevated)] text-[14px] font-normal text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsPinned(!isPinned)}
            className={`w-[44px] h-[44px] mt-5 rounded-[var(--radius-button)] border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
              isPinned
                ? 'bg-[var(--color-accent)] text-[#0B141A] border-transparent shadow-xs'
                : 'bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)] hover:bg-[var(--color-elevated)]'
            }`}
            title={isPinned ? 'Pinned note' : 'Pin note'}
            aria-label="Toggle Pin"
          >
            <Pin size={18} strokeWidth={2} className={isPinned ? 'fill-current' : ''} />
          </button>
        </div>

        {/* Note Body Text */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
            Note Content
          </label>
          <textarea
            rows={4}
            placeholder="Write key points, formulas, syllabus instructions, or paste message details..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-3.5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-elevated)] text-[14px] font-normal text-[var(--color-text)] placeholder-[var(--color-muted)] resize-none focus:outline-none focus:border-[var(--color-accent)] leading-relaxed transition-colors"
          />
        </div>

        {/* Important Topics / Checklist */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)] flex items-center gap-1.5">
            <CheckSquare size={14} className="text-[var(--color-accent)]" strokeWidth={2} />
            <span>Checklist ({checklist.length})</span>
          </label>

          {checklist.length > 0 && (
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden divide-y divide-[var(--color-border)] max-h-36 overflow-y-auto">
              {checklist.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-3 text-[13px] font-semibold text-[var(--color-text)]"
                >
                  <span className="truncate">{item.text}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(idx)}
                    className="text-[var(--color-muted)] hover:text-[var(--color-danger)] transition-colors p-1 cursor-pointer"
                    aria-label="Remove checklist item"
                  >
                    <Trash2 size={16} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Checklist Item Row */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Unit 3 - Normalization (BCNF, 3NF)"
              value={newChecklistText}
              onChange={(e) => setNewChecklistText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddChecklistItem();
                }
              }}
              className="flex-1 h-[44px] px-3.5 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-elevated)] text-[13px] font-medium text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
            <button
              type="button"
              onClick={handleAddChecklistItem}
              disabled={!newChecklistText.trim()}
              className="btn-secondary h-[44px] px-4 text-[13px] font-bold disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>

        {/* Linked Calendar Event */}
        {events.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
              Link to Calendar Event (Optional)
            </label>
            <select
              value={linkedEventId || ''}
              onChange={(e) =>
                setLinkedEventId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full h-[44px] px-3.5 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-elevated)] text-[13px] font-semibold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer transition-colors"
            >
              <option value="" className="bg-[var(--color-surface)] text-[var(--color-text)]">-- No linked event --</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id} className="bg-[var(--color-surface)] text-[var(--color-text)]">
                  {ev.title} ({new Date(ev.startAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
            Tags
          </label>
          <div className="flex flex-wrap gap-1.5 min-h-6">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[12px] font-semibold bg-[var(--color-accent-surface)] text-[var(--color-accent)] border border-[var(--color-accent-border)]"
              >
                #{tag.toLowerCase()}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-[var(--color-accent)] hover:opacity-70 font-bold cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add tag (e.g. syllabus, formula, exam)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              className="flex-1 h-[44px] px-3.5 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-elevated)] text-[13px] font-medium text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
            <button
              type="button"
              onClick={handleAddTag}
              disabled={!tagInput.trim()}
              className="btn-secondary h-[44px] px-4 text-[13px] font-bold disabled:opacity-40"
            >
              + Tag
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || (!text.trim() && checklist.length === 0)}
          className="btn-primary w-full h-[44px] text-[14px] font-bold flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>
            {isSubmitting
              ? 'Saving...'
              : noteToEdit
              ? 'Update Note'
              : 'Save Note'}
          </span>
        </button>
      </form>
    </BottomSheet>
  );
}
