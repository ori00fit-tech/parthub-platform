import { Link } from "react-router-dom";
import { formatPrice } from "../lib/formatters";

function readCompareItems() {
  try {
    const raw = localStorage.getItem("parthub_compare_items");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCompareItems(items) {
  try {
    localStorage.setItem("parthub_compare_items", JSON.stringify(items));
  } catch {
    // ignore
  }
}

function getBadge(part) {
  if (Number(part?.exact_vehicle_match || 0) === 1) return "Exact fit";
  if (Number(part?.partial_vehicle_match || 0) === 1) return "Vehicle match";
  if (Number(part?.compatibility_count || 0) > 0) return "Compatibility added";
  return "Basic listing";
}

export default function ComparePage() {
  const items = readCompareItems();

  function removeItem(id) {
    const next = items.filter((item) => item.id !== id);
    writeCompareItems(next);
    window.location.reload();
  }

  function clearAll() {
    writeCompareItems([]);
    window.location.reload();
  }

  if (items.length === 0) {
    return (
      <section className="space-y-6">
        <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-700 p-6 text-white shadow-lg sm:p-8">
          <h1 className="text-3xl font-bold sm:text-5xl">Compare parts</h1>
          <p className="mt-3 text-sm text-blue-100 sm:text-base">
            Compare shortlisted parts side by side.
          </p>
        </div>

        <div className="rounded-3xl border border-dashed border-line-strong bg-surface p-10 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-ink">No parts selected for comparison</h2>
          <p className="mt-2 text-sm text-muted">
            Add parts to shortlist from the search results first.
          </p>
          <Link
            to="/parts"
            className="mt-5 inline-flex h-12 items-center justify-center rounded-2xl bg-navy px-6 text-sm font-semibold text-white transition hover:bg-navy-deep"
          >
            Browse parts
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 pb-16">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold sm:text-5xl">Compare parts</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              Review price, stock, fitment depth, and seller quality side by side.
            </p>
          </div>

          <button
            type="button"
            onClick={clearAll}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Clear compare
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-sm">
        <div className="grid min-w-[980px] grid-cols-[220px_repeat(auto-fit,minmax(220px,1fr))]">
          <div className="border-r border-line bg-surface-2 p-5">
            <p className="font-semibold text-ink">Field</p>
          </div>

          {items.map((item) => (
            <div key={item.id} className="border-r border-line p-5 last:border-r-0">
              <div className="flex items-start justify-between gap-3">
                <p className="line-clamp-2 font-bold text-ink">{item.title}</p>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-400/20"
                >
                  Remove
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl bg-surface-2">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="h-36 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center text-sm text-faint">
                    No image
                  </div>
                )}
              </div>

              <Link
                to={`/parts/${item.slug}`}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-2xl bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy-deep"
              >
                Open part
              </Link>
            </div>
          ))}

          {[
            {
              label: "Price",
              value: (item) => formatPrice(item.price),
            },
            {
              label: "Condition",
              value: (item) => item.condition || "—",
            },
            {
              label: "Stock",
              value: (item) =>
                Number(item.quantity || 0) > 0 ? `${item.quantity} available` : "Out of stock",
            },
            {
              label: "Compatibility",
              value: (item) => `${Number(item.compatibility_count || 0)} row(s)`,
            },
            {
              label: "Fitment signal",
              value: (item) => getBadge(item),
            },
            {
              label: "Brand",
              value: (item) => item.brand_name || "—",
            },
            {
              label: "Category",
              value: (item) => item.category_name || "—",
            },
            {
              label: "Seller",
              value: (item) => item.seller_name || "Unknown seller",
            },
            {
              label: "Relevance",
              value: (item) =>
                Number(item.ranking_score || 0) >= 100 ? "High relevance" : "Standard",
            },
          ].map((row) => (
            <>
              <div key={row.label} className="border-t border-r border-line bg-surface-2 p-5">
                <p className="text-sm font-semibold text-ink">{row.label}</p>
              </div>
              {items.map((item) => (
                <div
                  key={`${row.label}-${item.id}`}
                  className="border-t border-r border-line p-5 last:border-r-0"
                >
                  <p className="text-sm text-ink-2">{row.value(item)}</p>
                </div>
              ))}
            </>
          ))}
        </div>
      </div>
    </section>
  );
}
