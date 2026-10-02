import { useState } from 'react';
import type { Group } from '@/db/db';
import { GroupList } from './GroupList';
import { ChatThread } from './ChatThread';

interface MessagesTabProps {
  onOpenAddSheet: () => void;
}

export function MessagesTab({ onOpenAddSheet }: MessagesTabProps) {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  if (selectedGroup) {
    return (
      <ChatThread
        group={selectedGroup}
        onBack={() => setSelectedGroup(null)}
        onOpenAddSheet={onOpenAddSheet}
      />
    );
  }

  return (
    <GroupList
      onSelectGroup={(g) => setSelectedGroup(g)}
      onOpenAddSheet={onOpenAddSheet}
    />
  );
}
