import { useState } from 'react';
import { X, Plus, Trash2, Clock, BookOpen, Sparkles } from 'lucide-react';
import {
  getAllClassSlots,
  addClassSlot,
  deleteClassSlot,
  seedSampleClassSlots,
  clearAllClassSlots,
} from '@/db/classSlotRepo';
import { useLiveQuery } from '@/db/useLiveQuery';
import { useToast } from '@/components/ToastContext';

interface TimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function formatMinute(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = String(m).padStart(2, '0');
  return `${displayH}:${displayM} ${ampm}`;
}

export function TimetableModal({ isOpen, onClose }: TimetableModalProps) {
  const { showToast } = useToast();
  const slots = useLiveQuery(() => getAllClassSlots(), []) || [];

  const [isAdding, setIsAdding] = useState(false);
  const [weekday, setWeekday] = useState(1); // Monday default
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [subject, setSubject] = useState('');

  if (!isOpen) return null;

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      showToast({ message: 'Please enter a course subject' });
      return;
    }

    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startMinute = (sh || 0) * 60 + (sm || 0);
    const endMinute = (eh || 0) * 60 + (em || 0);

    if (endMinute <= startMinute) {
      showToast({ message: 'End time must be after start time' });
      return;
    }

    await addClassSlot({
      weekday,
      startMinute,
      endMinute,
      subject: subject.trim(),
    });

    setSubject('');
    setIsAdding(false);
    showToast({ message: `Added ${subject.trim()} class` });
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    await deleteClassSlot(id);
    showToast({ message: 'Class slot removed' });
  };

  const handleSeed = async () => {
    await seedSampleClassSlots();
    showToast({ message: 'Added sample college timetable' });
  };

  const handleClear = async () => {
    await clearAllClassSlots();
    showToast({ message: 'Cleared timetable' });
  };

  // Group slots by weekday
  const groupedSlots = WEEKDAYS.map((dayName, idx) => ({
    weekdayIndex: idx,
    dayName,
    slots: slots.filter((s) => s.weekday === idx).sort((a, b) => a.startMinute - b.startMinute),
  })).filter((group) => group.weekdayIndex >= 1 && group.weekdayIndex <= 6); // Mon-Sat

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="timetable-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-elevated)] flex items-center justify-center text-[var(--color-accent)]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 id="timetable-title" className="text-base font-semibold text-[var(--color-text)]">
                Class Timetable
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Planner will keep study blocks clear of your classes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-full hover:bg-[var(--color-elevated)] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {slots.length === 0 && !isAdding && (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-[var(--color-text-muted)]">
                No classes registered in your weekly timetable.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-3 py-2 text-xs font-semibold bg-[var(--color-accent)] text-black rounded-lg hover:brightness-110 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add a Class
                </button>
                <button
                  onClick={handleSeed}
                  className="px-3 py-2 text-xs font-medium text-[var(--color-text)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-elevated)] flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                  Sample Timetable
                </button>
              </div>
            </div>
          )}

          {groupedSlots.map((group) => {
            if (group.slots.length === 0) return null;
            return (
              <div key={group.dayName} className="space-y-2">
                <h3 className="text-xs font-semibold text-[var(--color-accent)] tracking-wider uppercase">
                  {group.dayName}
                </h3>
                <div className="space-y-1.5">
                  {group.slots.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-elevated)] border border-[var(--color-border)]/60"
                    >
                      <div>
                        <div className="text-sm font-semibold text-[var(--color-text)]">
                          {s.subject}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>
                            {formatMinute(s.startMinute)} – {formatMinute(s.endMinute)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="w-8 h-8 flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-400 rounded-lg hover:bg-black/20"
                        title="Delete slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Add Slot Form */}
          {isAdding && (
            <form onSubmit={handleAddSlot} className="p-4 rounded-xl bg-[var(--color-elevated)] border border-[var(--color-accent)]/40 space-y-3">
              <div className="text-xs font-semibold text-[var(--color-accent)]">
                Add New Class Slot
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                  Day of week
                </label>
                <select
                  value={weekday}
                  onChange={(e) => setWeekday(Number(e.target.value))}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
                >
                  {WEEKDAYS.map((day, idx) => (
                    <option key={day} value={idx}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                    Start time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                    End time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                  Subject / Course Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. DBMS, Operating Systems"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-[var(--color-accent)] text-black rounded-lg hover:brightness-110"
                >
                  Save Class
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[var(--color-border)] flex items-center justify-between">
          {!isAdding ? (
            <>
              <button
                onClick={() => setIsAdding(true)}
                className="px-3 py-2 text-xs font-semibold bg-[var(--color-accent)] text-black rounded-lg hover:brightness-110 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Class
              </button>
              {slots.length > 0 && (
                <button
                  onClick={handleClear}
                  className="text-xs text-red-400 hover:text-red-300 hover:underline px-2 py-1"
                >
                  Clear All
                </button>
              )}
            </>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}
