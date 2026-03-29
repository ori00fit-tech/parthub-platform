export default function LoadingState({ message = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
