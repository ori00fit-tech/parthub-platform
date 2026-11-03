import { Link } from "react-router-dom";

const STORAGE_KEY = "parthub_saved_searches";

function readSavedSearches() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSavedSearches(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function saveSearchItem(item) {
  const current = readSavedSearches();
  const exists = current.some((entry) => entry.query === item.query);

  if (exists) return current;

  const next = [item, ...current].slice(0, 8);
  writeSavedSearches(next);
  return next;
}

export default function SavedSearchesPanel({ onLoadSearch }) {
  const items = readSavedSearches();

  function removeItem(query) {
    const next = items.filter((item) => item.query !== query);
    writeSavedSearches(next);
    window.location.reload();
  }

  if (items.length === 0) {
    return (
      <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <h2 className="text-xl font-bold text-ink">Saved searches</h2>
        <p className="mt-1 text-sm text-muted">
          Save important searches and return to them quickly.
        </p>

        <div className="mt-5 rounded-2xl border border-dashed border-line-strong bg-surface-2 p-4 text-sm text-muted">
          No saved searches yet.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-xl font-bold text-ink">Saved searches</h2>
      <p className="mt-1 text-sm text-muted">
        Re-open saved buyer intent in one click.
      </p>

      <div className="mt-5 space-y-3">
        {items.map((item, index) => (
          <div
            key={`${item.query}-${index}`}
            className="rounded-2xl border border-line bg-surface-2 p-4"
          >
            <p className="font-semibold text-ink">
              {item.label || item.query || "Saved search"}
            </p>

            <p className="mt-1 text-xs text-muted">
              {item.vehicleLabel ? `${item.vehicleLabel} • ` : ""}
              {item.query || "No keyword"}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onLoadSearch(item)}
                className="inline-flex h-10 items-center justify-center rounded-2xl bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy-deep"
              >
                Open
              </button>

              <Link
                to={`/parts?${item.query}`}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-line bg-surface px-4 text-sm font-semibold text-ink-2 transition hover:bg-white/5"
              >
                Open in page
              </Link>

              <button
                type="button"
                onClick={() => removeItem(item.query)}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-red-400/30 bg-red-400/10 px-4 text-sm font-semibold text-red-300 transition hover:bg-red-400/20"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
