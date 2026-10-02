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

        showToast({ message: 'Note created successfully' });
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
      title={noteToEdit ? 'Edit Note' : 'Create Study Note'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Subject & Pin */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
              Subject / Topic
            </label>
            <input
              type="text"
              placeholder="e.g. DBMS, OS, Computer Networks"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              style={{ minHeight: '44px' }}
            />
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
              Pin
            </label>
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`p-3 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                isPinned
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                  : 'border-[var(--color-border)] bg-[var(--color-elevated)] text-[var(--color-muted)] hover:text-[var(--color-text)]'
              }`}
              style={{ minHeight: '44px', minWidth: '44px' }}
              title={isPinned ? 'Pinned Note' : 'Pin Note'}
              aria-label="Toggle Pin"
            >
              <Pin size={18} className={isPinned ? 'fill-current' : ''} />
            </button>
          </div>
        </div>

        {/* Note Body Text */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
            Note Content
          </label>
          <textarea
            rows={4}
            placeholder="Write key points, formulas, syllabus instructions, or paste message details..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] text-sm text-[var(--color-text)] resize-none focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* Important Topics / Checklist */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider flex items-center gap-1.5">
            <CheckSquare size={14} className="text-[var(--color-accent)]" />
            <span>Important Topics / Checklist ({checklist.length})</span>
          </label>

          {checklist.length > 0 && (
            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
              {checklist.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--color-elevated)] border border-[var(--color-border)]"
                >
                  <span className="text-xs text-[var(--color-text)] truncate">{item.text}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(idx)}
                    className="text-[var(--color-muted)] hover:text-[var(--color-quiz)] transition-colors p-1"
                    aria-label="Remove checklist item"
                  >
                    <Trash2 size={13} />
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
              className="flex-1 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              style={{ minHeight: '40px' }}
            />
            <button
              type="button"
              onClick={handleAddChecklistItem}
              disabled={!newChecklistText.trim()}
              className="px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] text-[var(--color-text)] text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer"
              style={{ minHeight: '40px' }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Linked Calendar Event */}
        {events.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
              Link to Calendar Event (Optional)
            </label>
            <select
              value={linkedEventId || ''}
              onChange={(e) =>
                setLinkedEventId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              style={{ minHeight: '44px' }}
            >
              <option value="">-- No linked event --</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({new Date(ev.startAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
            Tags
          </label>
          <div className="flex flex-wrap gap-1.5 min-h-6">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-elevated)] text-[var(--color-text)] border border-[var(--color-border)]"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-[var(--color-muted)] hover:text-[var(--color-quiz)] cursor-pointer"
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
              className="flex-1 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              style={{ minHeight: '40px' }}
            />
            <button
              type="button"
              onClick={handleAddTag}
              disabled={!tagInput.trim()}
              className="px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] text-[var(--color-text)] text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer"
              style={{ minHeight: '40px' }}
            >
              + Tag
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || (!text.trim() && checklist.length === 0)}
          className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-black font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          style={{ minHeight: '44px' }}
        >
          <Plus size={18} strokeWidth={2.5} />
          {isSubmitting
            ? 'Saving...'
            : noteToEdit
            ? 'Update Note'
            : 'Save Note'}
        </button>
      </form>
    </BottomSheet>
  );
}
