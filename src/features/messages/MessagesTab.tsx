export function MessagesTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <p style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)' }}>
        No messages yet
      </p>
      <p
        className="mt-2"
        style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-xs)' }}
      >
        Tap + to paste or import a WhatsApp chat
      </p>
    </div>
  );
}
