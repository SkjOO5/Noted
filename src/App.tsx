import { useState, useEffect, useCallback } from 'react';
import { MessagesTab } from '@/features/messages/MessagesTab';
import { CalendarTab } from '@/features/calendar/CalendarTab';
import { NotesTab } from '@/features/notes/NotesTab';
import { RemindersTab } from '@/features/reminders/RemindersTab';
import { ToastProvider, useToast } from '@/components/ToastContext';
import { AddMessageSheet } from '@/components/AddMessageSheet';
import { SettingsSheet } from '@/features/settings/SettingsSheet';
import { DueReminderBanner } from '@/components/DueReminderBanner';
import { isDatabaseEmpty, seedSampleData } from '@/lib/seed/seedData';
import { useShareTarget } from '@/lib/share/useShareTarget';
import { useInstallPrompt } from '@/lib/pwa/useInstallPrompt';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import {
  Plus,
  Settings,
  Download,
  MessageSquare,
  Calendar,
  FileText,
  Bell,
} from 'lucide-react';

export type Tab = 'messages' | 'calendar' | 'notes' | 'reminders';

function AppContent() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('messages');
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sharedText, setSharedText] = useState('');
  const { isInstallable, triggerInstall } = useInstallPrompt();

  // Auto-seed only if explicitly enabled via query parameter (?demo=1) for testing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === '1') {
      isDatabaseEmpty().then((empty) => {
        if (empty) {
          seedSampleData().catch((err) => {
            console.warn('Auto-seed failed:', err);
          });
        }
      });
    }
  }, []);

  // Web and Native Share Target support
  const handleReceiveShare = useCallback(
    (text: string) => {
      setSharedText(text);
      setActiveTab('messages');
      setIsAddSheetOpen(true);
      showToast({ message: 'Received shared WhatsApp text!' });
    },
    [showToast]
  );

  useShareTarget({ onReceiveShare: handleReceiveShare });

  // Android Hardware Back Button listener
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backHandle: { remove: () => void } | undefined;

    CapApp.addListener('backButton', () => {
      // 1. If any modal sheet is open, close it
      if (isAddSheetOpen) {
        setIsAddSheetOpen(false);
        return;
      }
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return;
      }

      // 2. If on secondary tab, return to messages tab
      if (activeTab !== 'messages') {
        setActiveTab('messages');
        return;
      }

      // 3. Otherwise, exit the app
      CapApp.exitApp();
    }).then((handle) => {
      backHandle = handle;
    });

    return () => {
      if (backHandle) {
        backHandle.remove();
      }
    };
  }, [isAddSheetOpen, isSettingsOpen, activeTab]);

  const handleInstallClick = async () => {
    const success = await triggerInstall();
    if (success) {
      showToast({ message: 'WhatsAppText installed successfully!' });
    }
  };

  const navTabs: { id: Tab; label: string; icon: typeof MessageSquare }[] = [
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'reminders', label: 'Reminders', icon: Bell },
  ];

  return (
    <div
      className="flex flex-col h-full w-full mx-auto relative overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)] shadow-2xl border-x border-[var(--color-border)]"
      style={{ maxWidth: 'var(--max-content-width)' }}
    >
      {/* Top AppBar (56px) */}
      <header
        className="flex items-center justify-between px-4 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] z-20"
        style={{ height: 'var(--app-bar-height, 56px)' }}
      >
        <div className="flex items-center gap-2.5">
          {/* Brand Icon */}
          <img
            src="/icon.svg"
            alt="Noted Logo"
            className="w-8 h-8 rounded-lg shrink-0 object-contain shadow-xs"
          />

          <h1 className="text-[17px] font-semibold text-[var(--color-text)] tracking-tight">
            Noted
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Install App Button (PWA) */}
          {isInstallable && !Capacitor.isNativePlatform() && (
            <button
              onClick={handleInstallClick}
              className="h-[34px] px-2.5 rounded-lg bg-[var(--color-accent-surface)] hover:bg-[var(--color-accent)] hover:text-[#0B141A] text-[var(--color-accent)] border border-[var(--color-accent-border)] text-[12px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Install App"
            >
              <Download size={14} strokeWidth={2} />
              <span>Install</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-9 h-9 rounded-lg bg-[var(--color-elevated)] hover:bg-[var(--color-border)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            title="Settings & Privacy"
            aria-label="Settings and Privacy"
          >
            <Settings size={18} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {/* Due Reminder Alert Banner */}
      <DueReminderBanner />

      {/* Main Tab Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative no-scrollbar bg-[var(--color-bg)]">
        {activeTab === 'messages' && <MessagesTab onOpenAddSheet={() => setIsAddSheetOpen(true)} />}
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'notes' && <NotesTab />}
        {activeTab === 'reminders' && <RemindersTab />}
      </main>

      {/* Floating Action Button (+) for Messages */}
      {activeTab === 'messages' && (
        <button
          onClick={() => {
            setSharedText('');
            setIsAddSheetOpen(true);
          }}
          className="fixed bottom-[76px] right-4 md:right-[calc(50%-240px+16px)] w-14 h-14 rounded-full bg-[var(--color-accent)] text-[#0B141A] shadow-lg hover:scale-105 active:scale-95 transition-all z-20 flex items-center justify-center cursor-pointer"
          style={{
            boxShadow: '0 4px 16px rgba(37, 211, 102, 0.4)',
          }}
          aria-label="Add message or chat"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}

      {/* 4-Tab Bottom Navigation Bar (Contra Smartphone Wireframe Standard) */}
      <nav
        className="w-full shrink-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] z-30"
        style={{
          height: 'var(--tab-bar-height, 60px)',
          paddingLeft: 'var(--gutter, 16px)',
          paddingRight: 'var(--gutter, 16px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxSizing: 'border-box',
        }}
        role="tablist"
        aria-label="Bottom Navigation"
      >
        <div className="grid grid-cols-4 h-full items-center">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center h-full w-full py-1 transition-colors select-none cursor-pointer group ${
                  isActive
                    ? 'text-[var(--color-accent)] font-semibold'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)] font-normal'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-10 h-7 rounded-xl transition-all ${
                    isActive
                      ? 'bg-[var(--color-accent-surface)] text-[var(--color-accent)]'
                      : 'group-hover:bg-[var(--color-elevated)]'
                  }`}
                >
                  <IconComponent size={20} strokeWidth={isActive ? 2.2 : 1.75} />
                </div>
                <span className="text-[11px] tracking-tight mt-0.5">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Add / Import Message Sheet */}
      <AddMessageSheet
        isOpen={isAddSheetOpen}
        onClose={() => {
          setIsAddSheetOpen(false);
          setSharedText('');
        }}
        initialText={sharedText}
      />

      {/* Settings & Privacy Sheet */}
      <SettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
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
