import { useState, useRef, useEffect } from 'react';
import { BottomSheet } from './BottomSheet';
import { parseWhatsAppChat } from '@/lib/chat/chatParser';
import { createMessage } from '@/db/messageRepo';
import { getAllGroups, createGroup } from '@/db/groupRepo';
import { useLiveQuery } from '@/db/useLiveQuery';
import { Upload, Clipboard, Plus, MessageSquare } from 'lucide-react';

interface AddMessageSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGroupId?: number;
  initialText?: string;
  onImportSuccess?: (groupId: number, count: number) => void;
}

export function AddMessageSheet({
  isOpen,
  onClose,
  defaultGroupId,
  initialText = '',
  onImportSuccess,
}: AddMessageSheetProps) {
  const [text, setText] = useState(initialText);
  const [selectedGroupId, setSelectedGroupId] = useState<number | undefined>(defaultGroupId);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const groups = useLiveQuery(() => getAllGroups(), []) || [];

  useEffect(() => {
    if (initialText) {
      setText(initialText);
    }
  }, [initialText]);

  useEffect(() => {
    if (defaultGroupId) {
      setSelectedGroupId(defaultGroupId);
    } else if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [defaultGroupId, groups, selectedGroupId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Auto-fill group name from filename (e.g. "WhatsApp Chat - CSE-B Official.txt")
    const match = file.name.match(/WhatsApp Chat - (.*?)\.txt/i);
    if (match && match[1]) {
      setNewGroupName(match[1].trim());
      setIsCreatingNewGroup(true);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setText(content);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setText(clipText);
      }
    } catch {
      setError('Unable to read clipboard. Please paste directly into the box.');
    }
  };

  const parsedPreview = text.trim() ? parseWhatsAppChat(text) : [];

  const handleSubmit = async () => {
    setError(null);
    if (!text.trim()) {
      setError('Please paste or upload some messages first.');
      return;
    }

    try {
      setIsProcessing(true);
      let targetGroupId = selectedGroupId;

      if (isCreatingNewGroup || !targetGroupId) {
        const name = newGroupName.trim() || 'Imported Group';
        targetGroupId = await createGroup({
          name,
          lastMessageAt: new Date(),
          unreadCount: 0,
        });
      }

      const parsedMessages = parseWhatsAppChat(text);
      if (parsedMessages.length === 0) {
        setError('No messages could be parsed.');
        setIsProcessing(false);
        return;
      }

      let addedCount = 0;
      for (const msg of parsedMessages) {
        await createMessage({
          groupId: targetGroupId,
          sender: msg.sender,
          text: msg.text,
          timestamp: msg.timestamp,
          hash: msg.hash,
          chips: msg.chips,
          isImportant: msg.isImportant,
          ...(msg.subject ? { subject: msg.subject } : {}),
          ...(msg.topic ? { topic: msg.topic } : {}),
        });
        addedCount++;
      }

      setText('');
      setNewGroupName('');
      setIsCreatingNewGroup(false);
      setIsProcessing(false);
      onClose();
      onImportSuccess?.(targetGroupId, addedCount);
    } catch (err) {
      console.error(err);
      setError('Failed to import messages. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Import or paste messages">
      <div className="flex flex-col gap-3.5">
        {/* Quick Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handlePasteFromClipboard}
            className="btn-secondary flex-1 h-[44px] text-[13px] font-bold"
          >
            <Clipboard size={16} strokeWidth={2} className="text-slate-500 dark:text-[#8696A0]" />
            <span>Paste clipboard</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary flex-1 h-[44px] text-[13px] font-bold"
          >
            <Upload size={16} strokeWidth={2} className="text-slate-500 dark:text-[#8696A0]" />
            <span>Import .txt chat</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Group Selector */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-slate-400 dark:text-[#8696A0]">
              Target WhatsApp group
            </label>
            <button
              onClick={() => setIsCreatingNewGroup(!isCreatingNewGroup)}
              className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {isCreatingNewGroup ? 'Select existing' : '+ New group'}
            </button>
          </div>

          {isCreatingNewGroup || groups.length === 0 ? (
            <input
              type="text"
              placeholder="e.g. CSE 3rd Year Official"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full px-3.5 h-[44px] rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[14px] font-normal text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          ) : (
            <select
              value={selectedGroupId || ''}
              onChange={(e) => setSelectedGroupId(Number(e.target.value))}
              className="w-full px-3.5 h-[44px] rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[14px] font-semibold text-[var(--color-text)] focus:outline-none cursor-pointer transition-colors"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id} className="bg-[var(--color-surface)] text-[var(--color-text)]">
                  {g.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Text Area */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] tracking-[1.2px] font-semibold uppercase text-[var(--color-muted)]">
            WhatsApp text / chat export
          </label>
          <textarea
            rows={5}
            placeholder={`Paste copied message(s) here, e.g.:\n12/10/26, 9:41 pm - Aman CSE: kal 10 baje DBMS quiz hai, unit 3 tak`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-3.5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[13px] text-[var(--color-text)] font-mono resize-none focus:outline-none focus:border-[var(--color-accent)] transition-colors leading-relaxed placeholder-[var(--color-muted)]"
          />
        </div>

        {/* Parsed Preview Stats */}
        {parsedPreview.length > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-[var(--radius-card)] bg-[var(--color-accent-surface)] border border-[var(--color-accent-border)] text-[12px] font-semibold text-[var(--color-accent)]">
            <MessageSquare size={16} strokeWidth={2} className="text-[var(--color-accent)] shrink-0" />
            <span>
              Detected <strong>{parsedPreview.length}</strong> message
              {parsedPreview.length > 1 ? 's' : ''} ({parsedPreview.filter((m) => m.isImportant).length} urgent)
            </span>
          </div>
        )}

        {error && <div className="text-[12px] font-bold text-[var(--color-quiz)]">{error}</div>}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isProcessing || !text.trim()}
          className="btn-primary w-full h-[44px] text-[14px] font-bold flex items-center justify-center gap-2 cursor-pointer mt-1 disabled:opacity-50"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>{isProcessing ? 'Processing...' : 'Save & process messages'}</span>
        </button>
      </div>
    </BottomSheet>
  );
}
