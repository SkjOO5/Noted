export function CalendarTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <p style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)' }}>
        No events yet
      </p>
      <p
        className="mt-2"
        style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-xs)' }}
      >
        Swipe right on a message to create a calendar event
      </p>
    </div>
  );
}
