import { useState } from 'react';
import { MessagesTab } from '@/features/messages/MessagesTab';
import { CalendarTab } from '@/features/calendar/CalendarTab';
import { NotesTab } from '@/features/notes/NotesTab';
import { ToastProvider } from '@/components/ToastContext';
import { AddMessageSheet } from '@/components/AddMessageSheet';
import { Plus } from 'lucide-react';

type Tab = 'messages' | 'calendar' | 'notes';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('messages');
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

  return (
    <div
      className="flex flex-col h-full mx-auto relative overflow-hidden"
      style={{ maxWidth: 'var(--max-content-width)' }}
    >
      {/* App Bar */}
      <header
        className="flex items-center justify-between px-4 shrink-0"
        style={{
          height: 'var(--app-bar-height)',
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <h1
            className="font-semibold tracking-tight"
            style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text)' }}
          >
            WhatsAppText
          </h1>
        </div>
      </header>

      {/* Tab Bar */}
      <nav
        className="flex shrink-0"
        style={{
          height: 'var(--tab-bar-height)',
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}
        role="tablist"
        aria-label="Main navigation"
      >
        {(['messages', 'calendar', 'notes'] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 flex items-center justify-center text-sm font-semibold uppercase tracking-wide transition-colors cursor-pointer"
            style={{
              color: activeTab === tab ? 'var(--color-accent)' : 'var(--color-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--color-accent)' : '2px solid transparent',
              transitionDuration: 'var(--duration-fast)',
              fontSize: 'var(--font-size-sm)',
              minHeight: '44px',
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <main className="flex-1 overflow-hidden relative" style={{ backgroundColor: 'var(--color-bg)' }}>
        {activeTab === 'messages' && <MessagesTab onOpenAddSheet={() => setIsAddSheetOpen(true)} />}
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'notes' && <NotesTab />}
      </main>

      {/* Floating Action Button (+) */}
      <button
        onClick={() => setIsAddSheetOpen(true)}
        className="fixed bottom-6 right-6 md:right-[calc(50%-240px+24px)] w-14 h-14 rounded-full bg-[var(--color-accent)] text-black shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20 cursor-pointer"
        style={{
          boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
        }}
        aria-label="Add message or chat"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* Add / Import Message Sheet */}
      <AddMessageSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
