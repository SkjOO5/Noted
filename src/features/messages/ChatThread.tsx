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
import { ArrowLeft, Search, Filter, MessageSquareDashed } from 'lucide-react';

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
      {/* Thread Header */}
      <div
        className="flex items-center justify-between px-3 shrink-0 border-b border-[var(--color-border)]"
        style={{
          height: 'var(--app-bar-height)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="p-2 -ml-1 rounded-full text-[var(--color-text)] hover:bg-[var(--color-elevated)] transition-colors cursor-pointer"
            style={{ minHeight: '44px', minWidth: '44px' }}
            aria-label="Back to groups"
          >
            <ArrowLeft size={20} strokeWidth={2} />
          </button>

          <div className="flex flex-col min-w-0">
            <h2 className="text-sm font-semibold text-[var(--color-text)] truncate">
              {group.name}
            </h2>
            <span className="text-[11px] text-[var(--color-muted)]">
              {messages.length} message{messages.length !== 1 ? 's' : ''} •{' '}
              {messages.filter((m) => m.isImportant).length} important
            </span>
          </div>
        </div>

        {/* Filter / Search Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOnlyImportant(!onlyImportant)}
            className={`p-2 rounded-full transition-colors ${
              onlyImportant
                ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
            style={{ minHeight: '44px', minWidth: '44px' }}
            title={onlyImportant ? 'Showing all messages' : 'Show important only'}
          >
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="px-3 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center gap-2">
        <Search size={16} className="text-[var(--color-muted)] shrink-0" />
        <input
          type="text"
          placeholder="Search in this chat..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs bg-transparent text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none"
          style={{ minHeight: '32px' }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] px-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col justify-end">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center my-auto">
            <div className="w-12 h-12 rounded-full bg-[var(--color-elevated)] flex items-center justify-center text-[var(--color-muted)] mb-3">
              <MessageSquareDashed size={24} />
            </div>
            <p className="text-sm font-medium text-[var(--color-text)]">
              {searchQuery || onlyImportant ? 'No matching messages' : 'No messages in this chat yet'}
            </p>
            <p className="text-xs text-[var(--color-muted)] mt-1 max-w-xs">
              {searchQuery || onlyImportant
                ? 'Try resetting the filters or search keywords.'
                : 'Swipe right on any message to add to calendar, or swipe left to save note.'}
            </p>
            {!searchQuery && !onlyImportant && (
              <button
                onClick={onOpenAddSheet}
                className="mt-4 px-4 py-2 rounded-xl bg-[var(--color-accent)] text-black font-semibold text-xs cursor-pointer"
                style={{ minHeight: '44px' }}
              >
                + Paste or Import Messages
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
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
