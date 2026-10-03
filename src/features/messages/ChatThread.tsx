import { useState } from 'react';
import type { Group, Message, EventType } from '@/db/db';
import { getMessagesByGroupId } from '@/db/messageRepo';
import { createEvent, deleteEvent } from '@/db/eventRepo';
import { createNote, deleteNote } from '@/db/noteRepo';
import { createReminder, deleteReminder } from '@/db/reminderRepo';
import { useLiveQuery } from '@/db/useLiveQuery';
import { useToast } from '@/components/ToastContext';
import { MessageBubble } from '@/components/MessageBubble';
import { AmbiguousDateSheet } from '@/components/AmbiguousDateSheet';
import { ReminderSheet } from '@/components/ReminderSheet';
import { parseDate, type ParseResult } from '@/lib/parser/dateParser';
import { ArrowLeft, Search, Filter } from 'lucide-react';

interface ChatThreadProps {
  group: Group;
  onBack: () => void;
  onOpenAddSheet: () => void;
}

export function ChatThread({ group, onBack, onOpenAddSheet }: ChatThreadProps) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyImportant, setOnlyImportant] = useState(false);

  // Ambiguity confirm sheet state
  const [ambiguousState, setAmbiguousState] = useState<{
    message: Message;
    parseResult: ParseResult;
  } | null>(null);

  // Reminder sheet state
  const [reminderMessage, setReminderMessage] = useState<Message | null>(null);

  // Reactive message list for this group
  const messages = useLiveQuery(() => getMessagesByGroupId(group.id!), [group.id]) || [];

  // Filter messages
  const filteredMessages = messages.filter((m) => {
    if (onlyImportant && !m.isImportant) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.text.toLowerCase().includes(q) ||
        m.sender.toLowerCase().includes(q) ||
        m.subject?.toLowerCase().includes(q) ||
        m.topic?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Handle Swipe Right: Add to Calendar
  const handleAddToCalendar = async (message: Message, forcedDate?: Date, timeConfirmed?: boolean) => {
    if (!message.id) return;

    if (!forcedDate) {
      const parsedResults = parseDate(message.text, message.timestamp);

      if (parsedResults.length > 0) {
        const topResult = parsedResults[0];

        // Check for ambiguous slash date
        if (topResult.alternate) {
          setAmbiguousState({
            message,
            parseResult: topResult,
          });
          return;
        }

        await executeCreateCalendarEvent(message, topResult.date, topResult.timeConfirmed);
        return;
      }

      // No date found: default to tomorrow 9:00 AM with time unconfirmed
      const defaultDate = new Date(message.timestamp);
      defaultDate.setDate(defaultDate.getDate() + 1);
      defaultDate.setHours(9, 0, 0, 0);
      await executeCreateCalendarEvent(message, defaultDate, false);
    } else {
      await executeCreateCalendarEvent(message, forcedDate, timeConfirmed ?? true);
    }
  };

  const executeCreateCalendarEvent = async (
    message: Message,
    startAt: Date,
    timeConfirmed: boolean
  ) => {
    let eventType: EventType = 'other';
    const primaryChip = message.chips[0];
    if (primaryChip === 'quiz') eventType = 'quiz';
    else if (primaryChip === 'exam') eventType = 'exam';
    else if (primaryChip === 'assignment') eventType = 'assignment';
    else if (primaryChip === 'deadline') eventType = 'deadline';
    else if (primaryChip === 'room-change') eventType = 'class-change';

    const title = message.subject
      ? `${message.subject} ${eventType.toUpperCase()}${message.topic ? ` - ${message.topic}` : ''}`
      : message.text.slice(0, 35) + (message.text.length > 35 ? '...' : '');

    // Default reminder offsets: 1 day before (1440m) & 1 hour before (60m)
    const reminderOffsets = ['quiz', 'exam', 'deadline', 'assignment'].includes(eventType)
      ? [1440, 60]
      : [60];

    const eventId = await createEvent({
      title,
      startAt,
      allDay: !timeConfirmed,
      type: eventType,
      subject: message.subject,
      sourceMessageId: message.id,
      reminderOffsets,
      isDone: false,
      timeConfirmed,
    });

    // Create automatic scheduled reminder records for this event
    for (const offset of reminderOffsets) {
      const trigger = new Date(startAt.getTime() - offset * 60 * 1000);
      if (trigger > new Date()) {
        await createReminder({
          eventId,
          messageId: message.id,
          title: `Reminder: ${title}`,
          triggerAt: trigger,
          status: 'pending',
        });
      }
    }

    showToast({
      message: `Added "${title}" to Calendar!`,
      actionLabel: 'Undo',
      onAction: async () => {
        await deleteEvent(eventId);
      },
    });
  };

  // Handle Swipe Left: Save to Notes
  const handleSaveToNotes = async (message: Message) => {
    if (!message.id) return;

    const checklist: { text: string; done: boolean }[] = [];
    if (message.topic) {
      checklist.push({ text: message.topic, done: false });
    }

    const noteId = await createNote({
      text: message.text,
      subject: message.subject,
      sourceMessageId: message.id,
      isPinned: false,
      tags: message.chips,
      checklist: checklist.length > 0 ? checklist : undefined,
    });

    showToast({
      message: 'Saved message to Notes!',
      actionLabel: 'Undo',
      onAction: async () => {
        await deleteNote(noteId);
      },
    });
  };

  // Handle Long Press: Remind Me
  const handleLongPress = (message: Message) => {
    setReminderMessage(message);
  };

  const handleSetReminder = async (triggerAt: Date, label: string) => {
    if (!reminderMessage?.id) return;

    const title = reminderMessage.subject
      ? `${reminderMessage.subject} reminder`
      : `Message from ${reminderMessage.sender}`;

    const reminderId = await createReminder({
      messageId: reminderMessage.id,
      title: `${title} (${label})`,
      triggerAt,
      status: 'pending',
    });

    setReminderMessage(null);

    showToast({
      message: `Reminder set for ${triggerAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}!`,
      actionLabel: 'Undo',
      onAction: async () => {
        await deleteReminder(reminderId);
      },
    });
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)]">
      {/* Thread Sub-Header */}
      <div
        className="flex items-center justify-between px-4 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]"
        style={{
          height: '52px',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-lg text-[var(--color-muted)] bg-[var(--color-elevated)] border border-[var(--color-border)] hover:text-[var(--color-text)] active:scale-95 transition-all cursor-pointer flex items-center justify-center -ml-1"
            aria-label="Back to groups"
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
          </button>

          <div className="flex flex-col min-w-0">
            <h2 className="font-semibold text-[14px] text-[var(--color-text)] truncate">
              {group.name}
            </h2>
            <span className="text-[11px] font-normal text-[var(--color-muted)]">
              {messages.length} messages
              {messages.some((m) => m.isImportant) && (
                <> • <span className="text-[var(--color-accent)] font-semibold">{messages.filter((m) => m.isImportant).length} urgent</span></>
              )}
            </span>
          </div>
        </div>

        {/* Filter / Search Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setOnlyImportant(!onlyImportant)}
            className={`h-[32px] px-3 rounded-full text-[12px] font-semibold transition-all border cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95 ${
              onlyImportant
                ? 'bg-[var(--color-accent)] text-[#0B141A] border-transparent'
                : 'text-[var(--color-muted)] bg-[var(--color-surface)] border-[var(--color-border)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)]'
            }`}
            title={onlyImportant ? 'Showing all messages' : 'Show urgent only'}
          >
            <Filter size={13} strokeWidth={2.5} />
            <span>Urgent</span>
          </button>
        </div>
      </div>

      {/* Search Input Bar (44px) */}
      <div className="px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="relative h-[38px] flex items-center">
          <Search
            size={16}
            strokeWidth={2}
            className="absolute left-3 text-[var(--color-muted)] pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search in this chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-full pl-9 pr-3 rounded-[var(--radius-button)] bg-[var(--color-elevated)] border border-[var(--color-border)] text-[13px] font-normal text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-[12px] font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)] cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1.5">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center my-auto gap-4">
            <p className="text-[14px] font-normal text-[var(--color-muted)]">
              {searchQuery || onlyImportant ? 'No matching messages' : 'No messages in this chat yet'}
            </p>
            {!searchQuery && !onlyImportant && (
              <button
                onClick={onOpenAddSheet}
                className="btn-primary"
              >
                <span>+ Paste messages</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filteredMessages.map((msg) => (
              <MessageBubble
                key={msg.id || msg.hash}
                message={msg}
                onSwipeRight={handleAddToCalendar}
                onSwipeLeft={handleSaveToNotes}
                onLongPress={handleLongPress}
              />
            ))}
          </div>
        )}
      </div>

      {/* Ambiguous Date Confirmation Sheet */}
      {ambiguousState && (
        <AmbiguousDateSheet
          isOpen={true}
          onClose={() => setAmbiguousState(null)}
          messageText={ambiguousState.message.text}
          option1={{
            label: 'Day / Month (DD/MM)',
            date: ambiguousState.parseResult.date,
            timeConfirmed: ambiguousState.parseResult.timeConfirmed,
          }}
          option2={{
            label: 'Month / Day (MM/DD)',
            date: ambiguousState.parseResult.alternate!.date,
            timeConfirmed: ambiguousState.parseResult.alternate!.timeConfirmed,
          }}
          onSelect={async (opt) => {
            const msg = ambiguousState.message;
            setAmbiguousState(null);
            await handleAddToCalendar(msg, opt.date, opt.timeConfirmed);
          }}
        />
      )}

      {/* Reminder Picker Sheet */}
      {reminderMessage && (
        <ReminderSheet
          isOpen={true}
          onClose={() => setReminderMessage(null)}
          messageText={reminderMessage.text}
          onSetReminder={handleSetReminder}
        />
      )}
    </div>
  );
}
