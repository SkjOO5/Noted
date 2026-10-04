import { useState } from 'react';
import { X, Calendar, Check, RefreshCw, Trash2, BookOpen, Clock, AlertCircle } from 'lucide-react';
import type { Plan, StudyBlock, PlanViolation } from '@/lib/planner/types';
import { createEvent } from '@/db/eventRepo';
import { createReminder } from '@/db/reminderRepo';
import { useToast } from '@/components/ToastContext';

interface PlanReviewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan;
  violations: PlanViolation[];
  source?: 'greedy' | 'tinker' | 'fallback';
  onReplan: () => void;
  onPlanAccepted?: () => void;
}

function formatSessionTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDayHeader(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function PlanReviewSheet({
  isOpen,
  onClose,
  plan,
  violations,
  source = 'greedy',
  onReplan,
  onPlanAccepted,
}: PlanReviewSheetProps) {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set());

  if (!isOpen) return null;

  const activeBlocks = plan.blocks.filter((_, idx) => !excludedIndices.has(idx));

  const toggleExclude = (idx: number) => {
    const next = new Set(excludedIndices);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setExcludedIndices(next);
  };

  const handleAcceptAll = async () => {
    if (activeBlocks.length === 0) {
      showToast({ message: 'No study sessions selected' });
      return;
    }

    setIsSaving(true);
    try {
      let savedCount = 0;
      for (const block of activeBlocks) {
        const title = `Study: ${block.subject || 'Class'} - ${block.topic || 'Revision'}`;
        const startAt = new Date(block.start);
        const endAt = new Date(block.end);

        const eventId = await createEvent({
          title,
          startAt,
          endAt,
          allDay: false,
          type: 'study',
          subject: block.subject,
          reminderOffsets: [15], // remind 15m before study block
          isDone: false,
          timeConfirmed: true,
        });

        // Schedule notification reminder 15m ahead
        const triggerAt = new Date(startAt.getTime() - 15 * 60 * 1000);
        if (triggerAt > new Date()) {
          await createReminder({
            eventId,
            title: `Starting soon: ${title}`,
            triggerAt,
            status: 'pending',
          });
        }

        savedCount++;
      }

      showToast({ message: `Scheduled ${savedCount} study sessions into Calendar!` });
      onPlanAccepted?.();
      onClose();
    } catch (err) {
      console.error('Failed to save study plan:', err);
      showToast({ message: 'Failed to save study sessions' });
    } finally {
      setIsSaving(false);
    }
  };

  // Group blocks by day
  const groupedByDay = new Map<string, { block: StudyBlock; originalIndex: number }[]>();
  plan.blocks.forEach((block, idx) => {
    const dayKey = formatDayHeader(block.start);
    if (!groupedByDay.has(dayKey)) {
      groupedByDay.set(dayKey, []);
    }
    groupedByDay.get(dayKey)!.push({ block, originalIndex: idx });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-review-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="plan-review-title" className="text-base font-semibold text-[var(--color-text)]">
                Recommended Study Schedule
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-elevated)] text-[var(--color-accent)] border border-[var(--color-border)]">
                {source}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Review spaced study and revision blocks before adding to your calendar
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-full hover:bg-[var(--color-elevated)] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Violations notice if any */}
        {violations.length > 0 && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <span className="font-semibold">{violations.length} constraint notices:</span>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-300/90">
                {violations.slice(0, 3).map((v, i) => (
                  <li key={i}>{v.message}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {plan.blocks.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Calendar className="w-8 h-8 text-[var(--color-text-muted)] mx-auto opacity-50" />
              <p className="text-sm text-[var(--color-text-muted)]">
                No upcoming quizzes, exams, or assignments detected in your calendar.
              </p>
              <p className="text-xs text-[var(--color-text-muted)]/80">
                Add an event in Messages or Calendar first to generate a revision plan.
              </p>
            </div>
          ) : (
            Array.from(groupedByDay.entries()).map(([dayHeader, items]) => (
              <div key={dayHeader} className="space-y-2">
                <div className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wider">
                  {dayHeader}
                </div>
                <div className="space-y-2">
                  {items.map(({ block, originalIndex }) => {
                    const isExcluded = excludedIndices.has(originalIndex);
                    return (
                      <div
                        key={originalIndex}
                        className={`flex items-start justify-between p-3.5 rounded-xl border transition-all ${
                          isExcluded
                            ? 'bg-[var(--color-surface)] border-[var(--color-border)]/40 opacity-40'
                            : 'bg-[var(--color-elevated)] border-[var(--color-border)]'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-accent)] shrink-0 mt-0.5">
                            <BookOpen className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-[var(--color-text)]">
                                {block.subject || 'Study'}
                              </span>
                              <span
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                  block.kind === 'revision'
                                    ? 'bg-purple-500/20 text-purple-300'
                                    : 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                                }`}
                              >
                                {block.kind}
                              </span>
                            </div>
                            {block.topic && (
                              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                {block.topic}
                              </p>
                            )}
                            <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] mt-1">
                              <Clock className="w-3 h-3" />
                              <span>
                                {formatSessionTime(block.start)} – {formatSessionTime(block.end)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => toggleExclude(originalIndex)}
                          className={`p-1.5 rounded-lg text-xs transition-colors ${
                            isExcluded
                              ? 'text-[var(--color-accent)] hover:bg-[var(--color-elevated)]'
                              : 'text-[var(--color-text-muted)] hover:text-red-400 hover:bg-black/20'
                          }`}
                          title={isExcluded ? 'Include session' : 'Remove session'}
                        >
                          {isExcluded ? <PlusIcon className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Controls */}
        <div className="p-4 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onReplan}
              className="px-3 py-2 text-xs font-medium text-[var(--color-text)] border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-elevated)] flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              Replan
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              Discard
            </button>
          </div>

          <button
            onClick={handleAcceptAll}
            disabled={isSaving || activeBlocks.length === 0}
            className="px-4 py-2.5 text-xs font-semibold bg-[var(--color-accent)] text-black rounded-xl hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Check className="w-4 h-4" />
            {isSaving ? 'Scheduling...' : `Accept All (${activeBlocks.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
