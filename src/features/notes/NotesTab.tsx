export function NotesTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <p style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)' }}>
        No notes yet
      </p>
      <p
        className="mt-2"
        style={{ color: 'var(--color-muted)', fontSize: 'var(--font-size-xs)' }}
      >
        Swipe left on a message to save it as a note
      </p>
    </div>
  );
}
