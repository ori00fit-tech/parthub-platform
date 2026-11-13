import { Fragment } from "react";
import { Link } from "react-router-dom";
import { formatPrice } from "../lib/formatters";
import { t, useT } from "../i18n";
import { mediaUrl } from "../lib/media";

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
  if (Number(part?.exact_vehicle_match || 0) === 1) return t("Exact fit");
  if (Number(part?.partial_vehicle_match || 0) === 1) return t("Vehicle match");
  if (Number(part?.compatibility_count || 0) > 0) return t("Compatibility added");
  return t("Basic listing");
}

export default function ComparePage() {
  const t = useT();
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
          <h1 className="text-3xl font-bold sm:text-5xl">{t("Compare parts")}</h1>
          <p className="mt-3 text-sm text-blue-100 sm:text-base">
            {t("Compare shortlisted parts side by side.")}
          </p>
        </div>

        <div className="rounded-3xl border border-dashed border-line-strong bg-surface p-10 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-ink">{t("No parts selected for comparison")}</h2>
          <p className="mt-2 text-sm text-muted">
            {t("Add parts to shortlist from the search results first.")}
          </p>
          <Link
            to="/parts"
            className="mt-5 inline-flex h-12 items-center justify-center rounded-2xl bg-navy px-6 text-sm font-semibold text-white transition hover:bg-navy-deep"
          >
            {t("Browse parts")}
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
            <h1 className="text-3xl font-bold sm:text-5xl">{t("Compare parts")}</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              {t("Review price, stock, fitment depth, and seller quality side by side.")}
            </p>
          </div>

          <button
            type="button"
            onClick={clearAll}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            {t("Clear compare")}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-sm">
        <div
          className="grid min-w-[980px]"
          style={{ gridTemplateColumns: `220px repeat(${items.length}, minmax(220px, 1fr))` }}
        >
          <div className="border-e border-line bg-surface-2 p-5">
            <p className="font-semibold text-ink">{t("Field")}</p>
          </div>

          {items.map((item) => (
            <div key={item.id} className="border-e border-line p-5 last:border-e-0">
              <div className="flex items-start justify-between gap-3">
                <p dir="auto" className="line-clamp-2 font-bold text-ink">{item.title}</p>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-400/20"
                >
                  {t("Remove")}
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl bg-surface-2">
                {item.image_url ? (
                  <img
                    src={mediaUrl(item.image_url, 320)}
                    alt={item.title}
                    className="h-36 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center text-sm text-faint">
                    {t("No image")}
                  </div>
                )}
              </div>

              <Link
                to={`/parts/${item.slug}`}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-2xl bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy-deep"
              >
                {t("Open part")}
              </Link>
            </div>
          ))}

          {[
            {
              label: t("Price"),
              value: (item) => formatPrice(item.price),
            },
            {
              label: t("Condition"),
              value: (item) => item.condition || "—",
            },
            {
              label: t("Stock"),
              value: (item) =>
                Number(item.quantity || 0) > 0 ? t("{n} available", { n: item.quantity }) : t("Out of stock"),
            },
            {
              label: t("Compatibility"),
              value: (item) => t("{n} row(s)", { n: Number(item.compatibility_count || 0) }),
            },
            {
              label: t("Fitment signal"),
              value: (item) => getBadge(item),
            },
            {
              label: t("Brand"),
              value: (item) => item.brand_name || "—",
            },
            {
              label: t("Category"),
              value: (item) => (item.category_name ? t(item.category_name) : "—"),
            },
            {
              label: t("Seller"),
              value: (item) => item.seller_name || t("Unknown seller"),
            },
            {
              label: t("Relevance"),
              value: (item) =>
                Number(item.ranking_score || 0) >= 100 ? t("High relevance") : t("Standard"),
            },
          ].map((row, rowIndex) => (
            <Fragment key={rowIndex}>
              <div className="border-t border-e border-line bg-surface-2 p-5">
                <p className="text-sm font-semibold text-ink">{row.label}</p>
              </div>
              {items.map((item) => (
                <div
                  key={`${rowIndex}-${item.id}`}
                  className="border-t border-e border-line p-5 last:border-e-0"
                >
                  <p className="text-sm text-ink-2">{row.value(item)}</p>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
