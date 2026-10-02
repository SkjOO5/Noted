import { useState } from 'react';
import type { Group } from '@/db/db';
import { getAllGroups, deleteGroup } from '@/db/groupRepo';
import { useLiveQuery } from '@/db/useLiveQuery';
import { useToast } from '@/components/ToastContext';
import { Search, Users, Trash2, Plus } from 'lucide-react';

interface GroupListProps {
  onSelectGroup: (group: Group) => void;
  onOpenAddSheet: () => void;
}

const AVATAR_COLORS = [
  '#25D366', // WhatsApp green
  '#34B7F1', // Blue
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
  '#A78BFA', // Purple
  '#F472B6', // Pink
];

function getAvatarColor(id?: number, name: string = ''): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs((id ?? hash) % AVATAR_COLORS.length);
  return AVATAR_COLORS[index];
}

function formatGroupDate(date?: Date): string {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Yesterday';

  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export function GroupList({ onSelectGroup, onOpenAddSheet }: GroupListProps) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const groups = useLiveQuery(() => getAllGroups(), []) || [];

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.lastMessageText?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteGroup = async (e: React.MouseEvent, group: Group) => {
    e.stopPropagation();
    if (!group.id) return;

    await deleteGroup(group.id);
    showToast({
      message: `Deleted group "${group.name}"`,
    });
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)]">
      {/* Search Bar */}
      <div className="p-3 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--color-elevated)] border border-[var(--color-border)]">
          <Search size={16} className="text-[var(--color-muted)] shrink-0" />
          <input
            type="text"
            placeholder="Search chats or messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none"
            style={{ minHeight: '28px' }}
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
      </div>

      {/* Group List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)]">
        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--color-elevated)] flex items-center justify-center text-[var(--color-muted)] mb-3">
              <Users size={28} />
            </div>
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {searchQuery ? 'No matching chats found' : 'No WhatsApp chats yet'}
            </p>
            <p className="text-xs text-[var(--color-muted)] mt-1 max-w-xs">
              {searchQuery
                ? 'Try searching with a different name or keyword.'
                : 'Paste a WhatsApp message or import a .txt chat export to extract dates, notes, and reminders.'}
            </p>
            {!searchQuery && (
              <button
                onClick={onOpenAddSheet}
                className="mt-5 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-accent)] text-black font-semibold text-xs hover:opacity-90 transition-all cursor-pointer"
                style={{ minHeight: '44px' }}
              >
                <Plus size={16} strokeWidth={2.5} />
                + Import or Paste Chat
              </button>
            )}
          </div>
        ) : (
          filteredGroups.map((group) => {
            const avatarColor = group.avatarColor || getAvatarColor(group.id, group.name);
            const initials = group.name
              .split(' ')
              .map((w) => w[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div
                key={group.id}
                onClick={() => onSelectGroup(group)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface)] active:bg-[var(--color-elevated)] transition-colors cursor-pointer group select-none"
                style={{ minHeight: '68px' }}
              >
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs"
                  style={{
                    backgroundColor: `${avatarColor}25`,
                    color: avatarColor,
                    border: `1.5px solid ${avatarColor}50`,
                  }}
                >
                  {initials || <Users size={18} />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-sm font-semibold text-[var(--color-text)] truncate">
                      {group.name}
                    </h3>
                    <span className="text-[11px] text-[var(--color-muted)] shrink-0">
                      {formatGroupDate(group.lastMessageAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-[var(--color-muted)] truncate">
                      {group.lastMessageText || 'No messages yet'}
                    </p>
                    {group.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-accent)] text-black text-[10px] font-bold shrink-0">
                        {group.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete button on hover / touch */}
                <button
                  onClick={(e) => handleDeleteGroup(e, group)}
                  title="Delete chat"
                  className="p-2 rounded-full text-[var(--color-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-quiz)] hover:bg-[var(--color-elevated)] transition-all cursor-pointer"
                  style={{ minHeight: '36px', minWidth: '36px' }}
                  aria-label={`Delete ${group.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
