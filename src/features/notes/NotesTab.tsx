import { useState, useMemo } from 'react';
import type { Note } from '@/db/db';
import { getAllNotes } from '@/db/noteRepo';
import { useLiveQuery } from '@/db/useLiveQuery';
import { NoteCard } from './NoteCard';
import { AddNoteSheet } from './AddNoteSheet';
import { Search, Plus, BookOpen, Pin } from 'lucide-react';

export function NotesTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const notes = useLiveQuery(() => getAllNotes(), []) || [];

  // Extract distinct subjects
  const distinctSubjects = useMemo(() => {
    const set = new Set<string>();
    for (const note of notes) {
      if (note.subject && note.subject.trim()) {
        set.add(note.subject.trim());
      }
    }
    return Array.from(set).sort();
  }, [notes]);

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      // Pinned filter
      if (onlyPinned && !note.isPinned) return false;

      // Subject filter
      if (selectedSubject !== 'all' && note.subject !== selectedSubject) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText = note.text.toLowerCase().includes(query);
        const matchesSubject = note.subject?.toLowerCase().includes(query);
        const matchesTag = note.tags?.some((t) => t.toLowerCase().includes(query));
        const matchesChecklist = note.checklist?.some((c) =>
          c.text.toLowerCase().includes(query)
        );

        if (!matchesText && !matchesSubject && !matchesTag && !matchesChecklist) {
          return false;
        }
      }

      return true;
    });
  }, [notes, onlyPinned, selectedSubject, searchQuery]);

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsAddOpen(true);
  };

  const handleCloseSheet = () => {
    setIsAddOpen(false);
    setEditingNote(null);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)] overflow-y-auto">
      {/* Search & Action Header */}
      <div className="p-3 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0 flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
            />
            <input
              type="text"
              placeholder="Search notes, formulas, topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--color-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)]"
              style={{ minHeight: '38px' }}
            />
          </div>

          {/* Quick Add Note Button */}
          <button
            onClick={() => {
              setEditingNote(null);
              setIsAddOpen(true);
            }}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[var(--color-accent)] text-black font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer shrink-0"
            style={{ minHeight: '38px' }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Note</span>
          </button>
        </div>

        {/* Filter Pills (Subject & Pinned) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
          {/* Pinned filter button */}
          <button
            onClick={() => setOnlyPinned(!onlyPinned)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold border transition-colors cursor-pointer shrink-0 ${
              onlyPinned
                ? 'bg-[var(--color-accent)]/20 border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'bg-[var(--color-elevated)] border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <Pin size={12} className={onlyPinned ? 'fill-current' : ''} />
            <span>Pinned</span>
          </button>

          {/* All Subjects Pill */}
          <button
            onClick={() => setSelectedSubject('all')}
            className={`px-3 py-1 rounded-full font-semibold border transition-colors cursor-pointer shrink-0 ${
              selectedSubject === 'all'
                ? 'bg-[var(--color-elevated)] border-[var(--color-accent)] text-[var(--color-text)]'
                : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            All ({notes.length})
          </button>

          {/* Distinct Subject Pills */}
          {distinctSubjects.map((sub) => {
            const count = notes.filter((n) => n.subject === sub).length;
            const isSelected = selectedSubject === sub;
            return (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1 rounded-full font-semibold border transition-colors cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-[var(--color-elevated)] border-[var(--color-accent)] text-[var(--color-text)]'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {sub} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes List Container */}
      <div className="flex-1 p-3 flex flex-col gap-2.5">
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center my-auto px-4">
            <div className="w-12 h-12 rounded-full bg-[var(--color-elevated)] flex items-center justify-center text-[var(--color-muted)] mb-3">
              <BookOpen size={24} />
            </div>
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {searchQuery || selectedSubject !== 'all' || onlyPinned
                ? 'No matching notes found'
                : 'No notes yet'}
            </p>
            <p className="text-xs text-[var(--color-muted)] mt-1 max-w-xs">
              {searchQuery || selectedSubject !== 'all' || onlyPinned
                ? 'Try clearing the search query or changing active filters.'
                : 'Swipe left on any WhatsApp message or tap "+ Note" to capture syllabus checklists and key points.'}
            </p>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <NoteCard key={note.id} note={note} onEdit={handleEditNote} />
          ))
        )}
      </div>

      {/* Add / Edit Note Sheet */}
      <AddNoteSheet
        isOpen={isAddOpen}
        onClose={handleCloseSheet}
        noteToEdit={editingNote}
        defaultSubject={selectedSubject !== 'all' ? selectedSubject : ''}
      />
    </div>
  );
}
