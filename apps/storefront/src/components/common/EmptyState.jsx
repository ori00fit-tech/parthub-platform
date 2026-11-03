export default function EmptyState({ title = "Nothing here", message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">📭</div>
      <h3 className="text-lg font-semibold text-ink-2 mb-2">{title}</h3>
      {message && <p className="text-faint text-sm max-w-sm mb-6">{message}</p>}
      {action}
    </div>
  );
}
