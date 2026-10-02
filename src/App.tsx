import { useState } from 'react';
import { MessagesTab } from '@/features/messages/MessagesTab';
import { CalendarTab } from '@/features/calendar/CalendarTab';
import { NotesTab } from '@/features/notes/NotesTab';

type Tab = 'messages' | 'calendar' | 'notes';

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('messages');

  return (
    <div
      className="flex flex-col h-full mx-auto"
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
        <h1
          className="font-semibold"
          style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text)' }}
        >
          WhatsAppText
        </h1>
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
            className="flex-1 flex items-center justify-center text-sm font-semibold uppercase tracking-wide transition-colors"
            style={{
              color: activeTab === tab ? 'var(--color-accent)' : 'var(--color-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--color-accent)' : '2px solid transparent',
              transitionDuration: 'var(--duration-fast)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--color-bg)' }}>
        {activeTab === 'messages' && <MessagesTab />}
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'notes' && <NotesTab />}
      </main>
    </div>
  );
}
