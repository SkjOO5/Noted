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
  '#2563EB', // Royal blue
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
    <div className="flex flex-col gap-3 px-4 py-3">
      {/* Search Bar (44px) */}
      <div className="relative h-[44px] flex items-center">
        <Search
          size={20}
          strokeWidth={1.75}
          className="absolute left-3 text-[var(--color-muted)] pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search college groups, subjects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-full pl-10 pr-3 rounded-[var(--radius-button)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[14px] font-normal text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
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

      {/* Group Cards List */}
      <div className="flex flex-col gap-2.5">
        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4 my-auto">
            <p className="text-[14px] font-normal text-[var(--color-muted)]">
              {searchQuery ? 'No matching chats found' : 'No WhatsApp chats yet'}
            </p>
            {!searchQuery ? (
              <button
                onClick={onOpenAddSheet}
                className="btn-primary"
              >
                <Plus size={18} strokeWidth={2} />
                <span>Paste chat</span>
              </button>
            ) : (
              <button
                onClick={() => setSearchQuery('')}
                className="btn-secondary"
              >
                Clear search
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
                data-card="true"
                onClick={() => onSelectGroup(group)}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)] p-3.5 flex items-center gap-3 select-none relative group hover:border-[var(--color-accent)]/40 transition-colors cursor-pointer"
                style={{ minHeight: '68px' }}
              >
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center font-semibold text-[14px] shrink-0"
                  style={{
                    backgroundColor: avatarColor,
                    color: '#FFFFFF',
                  }}
                >
                  {initials || <Users size={18} strokeWidth={2} />}
                </div>

                {/* Group Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="font-semibold text-[14px] text-[var(--color-text)] truncate">
                      {group.name}
                    </h3>
                    <span className="text-[12px] font-normal text-[var(--color-muted)] shrink-0">
                      {formatGroupDate(group.lastMessageAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-[12px] font-normal text-[var(--color-muted)] truncate">
                      {group.lastMessageText || 'No messages yet'}
                    </p>
                    {group.unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center h-5 px-2 rounded-full bg-[var(--color-accent)] text-[#0B141A] text-[11px] font-bold shrink-0">
                        {group.unreadCount} new
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Action / Delete */}
                <button
                  onClick={(e) => handleDeleteGroup(e, group)}
                  title="Delete chat"
                  className="w-8 h-8 rounded-lg text-[var(--color-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-quiz)] hover:bg-[var(--color-elevated)] transition-all cursor-pointer flex items-center justify-center shrink-0"
                  aria-label={`Delete ${group.name}`}
                >
                  <Trash2 size={16} strokeWidth={1.75} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
