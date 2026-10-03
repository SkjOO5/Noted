import { useState, useMemo } from 'react';
import type { Note } from '@/db/db';
import { getAllNotes } from '@/db/noteRepo';
import { useLiveQuery } from '@/db/useLiveQuery';
import { NoteCard } from './NoteCard';
import { AddNoteSheet } from './AddNoteSheet';
import { Search, Plus, Pin } from 'lucide-react';

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
    <div className="flex flex-col gap-3 px-4 py-3">
      {/* Toolbar row (search + new note) */}
      <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
        <div className="relative h-[44px] flex items-center">
          <Search
            size={18}
            strokeWidth={2}
            className="absolute left-3 text-[var(--color-muted)] pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[44px] pl-10 pr-3 rounded-[var(--radius-button)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[14px] font-normal text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors box-border"
          />
        </div>

        <button
          onClick={() => {
            setEditingNote(null);
            setIsAddOpen(true);
          }}
          className="btn-primary h-[44px] px-3.5 text-[13px] font-semibold flex items-center justify-center gap-1.5 box-border"
          aria-label="+ Note"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>+ Note</span>
        </button>
      </div>

      {/* Filter chips row */}
      <div className="flex items-center gap-1.5 overflow-x-auto px-4 -mx-4 py-0.5 snap-x no-scrollbar">
        {/* All chip */}
        <button
          onClick={() => {
            setSelectedSubject('all');
            setOnlyPinned(false);
          }}
          className={`h-8 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors border shrink-0 snap-start cursor-pointer flex items-center gap-1.5 select-none ${
            selectedSubject === 'all' && !onlyPinned
              ? 'bg-[var(--color-accent)] text-[#0B141A] border-transparent shadow-xs'
              : 'bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)]'
          }`}
        >
          <span>All</span>
          <span
            className={`text-[11px] ${
              selectedSubject === 'all' && !onlyPinned ? 'opacity-90 font-bold' : 'text-[var(--color-muted)]'
            }`}
          >
            {notes.length}
          </span>
        </button>

        {/* Pinned chip */}
        <button
          onClick={() => setOnlyPinned(!onlyPinned)}
          className={`h-8 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors border shrink-0 snap-start cursor-pointer flex items-center gap-1.5 select-none ${
            onlyPinned
              ? 'bg-[var(--color-accent)] text-[#0B141A] border-transparent shadow-xs'
              : 'bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)]'
          }`}
        >
          <Pin size={12} strokeWidth={2} className={onlyPinned ? 'fill-current' : ''} />
          <span>Pinned</span>
          <span
            className={`text-[11px] ${
              onlyPinned ? 'opacity-90 font-bold' : 'text-[var(--color-muted)]'
            }`}
          >
            {notes.filter((n) => n.isPinned).length}
          </span>
        </button>

        {/* Distinct Subject chips */}
        {distinctSubjects.map((sub) => {
          const count = notes.filter((n) => n.subject === sub).length;
          const isSelected = selectedSubject === sub && !onlyPinned;
          return (
            <button
              key={sub}
              onClick={() => {
                setSelectedSubject(sub);
                setOnlyPinned(false);
              }}
              className={`h-8 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors border shrink-0 snap-start cursor-pointer flex items-center gap-1.5 select-none ${
                isSelected
                  ? 'bg-[var(--color-accent)] text-[#0B141A] border-transparent shadow-xs'
                  : 'bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)]'
              }`}
            >
              <span>{sub}</span>
              <span
                className={`text-[11px] ${
                  isSelected ? 'opacity-90 font-bold' : 'text-[var(--color-muted)]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notes List or Empty State */}
      {filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4 my-auto">
          <p className="text-[13px] text-[var(--color-muted)] font-normal">
            {searchQuery || selectedSubject !== 'all' || onlyPinned
              ? 'No matching notes found'
              : 'No notes saved yet'}
          </p>
          <button
            onClick={() => {
              setEditingNote(null);
              setIsAddOpen(true);
            }}
            className="btn-primary"
            aria-label="+ Note"
          >
            <Plus size={18} strokeWidth={2} />
            <span>+ Note</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredNotes.map((note) => (
            <NoteCard key={note.id} note={note} onEdit={handleEditNote} />
          ))}
        </div>
      )}

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
