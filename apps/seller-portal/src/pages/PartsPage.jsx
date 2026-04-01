import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

function normalizeItems(payload) {
  const list =
    payload?.data?.items ||
    payload?.data?.parts ||
    payload?.data ||
    payload?.items ||
    payload?.parts ||
    [];

  return Array.isArray(list) ? list : [];
}

function statusBadgeClasses(status) {
  switch (String(status || "").toLowerCase()) {
    case "active":
      return "bg-green-50 text-green-700";
    case "draft":
      return "bg-amber-50 text-amber-700";
    case "archived":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-blue-50 text-blue-700";
  }
}

function stockTone(quantity) {
  const n = Number(quantity || 0);
  if (n <= 0) return "text-red-600";
  if (n <= 5) return "text-amber-600";
  return "text-green-600";
}

export default function PartsPage() {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");

  useEffect(() => {
    let active = true;

    async function loadParts() {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/api/v1/marketplace/me/parts");
        if (!active) return;
        setParts(normalizeItems(res));
      } catch (err) {
        if (!active) return;
        setParts([]);
        setError(err?.message || "Failed to load seller inventory");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadParts();

    return () => {
      active = false;
    };
  }, []);

  const filteredParts = useMemo(() => {
    const q = query.trim().toLowerCase();

    return parts.filter((part) => {
      const haystack = [
        part.title,
        part.slug,
        part.sku,
        part.brand_name,
        part.category_name,
        part.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !q || haystack.includes(q);
      const matchesStatus =
        !statusFilter || String(part.status || "").toLowerCase() === statusFilter;
      const qty = Number(part.quantity || 0);

      const matchesStock =
        !stockFilter ||
        (stockFilter === "in_stock" && qty > 0) ||
        (stockFilter === "low_stock" && qty > 0 && qty <= 5) ||
        (stockFilter === "out_of_stock" && qty <= 0);

      return matchesQuery && matchesStatus && matchesStock;
    });
  }, [parts, query, statusFilter, stockFilter]);

  const counts = useMemo(() => {
    return {
      total: parts.length,
      active: parts.filter((p) => String(p.status || "").toLowerCase() === "active").length,
      draft: parts.filter((p) => String(p.status || "").toLowerCase() === "draft").length,
      lowStock: parts.filter((p) => {
        const qty = Number(p.quantity || 0);
        return qty > 0 && qty <= 5;
      }).length,
    };
  }, [parts]);

  function clearFilters() {
    setQuery("");
    setStatusFilter("");
    setStockFilter("");
  }

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading seller inventory...
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              Inventory management
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">Your parts inventory</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              Search, review, and manage your part listings from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/parts/create"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
            >
              + Create part
            </Link>
            <Link
              to="/media-upload"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Upload media
            </Link>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total parts</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{counts.total}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Active</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{counts.active}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Drafts</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{counts.draft}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Low stock</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{counts.lowStock}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, SKU, brand, category..."
            className="h-12 rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-12 rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="h-12 rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
          >
            <option value="">All stock states</option>
            <option value="in_stock">In stock</option>
            <option value="low_stock">Low stock</option>
            <option value="out_of_stock">Out of stock</option>
          </select>

          <button
            type="button"
            onClick={clearFilters}
            className="h-12 rounded-2xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Reset
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{filteredParts.length}</span> parts found
        </div>
      </div>

      {filteredParts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <div className="text-5xl">📦</div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">No parts yet</h2>
          <p className="mt-2 text-sm text-gray-500">
            Create your first listing to start building your seller inventory.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/parts/create"
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Create part
            </Link>
            <Link
              to="/media-upload"
              className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              Upload media
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredParts.map((part) => {
            const qty = Number(part.quantity || 0);

            return (
              <article
                key={part.id}
                className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="grid h-full grid-cols-1 sm:grid-cols-[160px_1fr]">
                  <div className="bg-gray-100">
                    {part.image_url ? (
                      <img
                        src={part.image_url}
                        alt={part.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full min-h-[160px] items-center justify-center text-sm text-gray-400">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-xl font-bold text-gray-900">
                          {part.title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {part.brand_name || "Unknown brand"} • {part.category_name || "Uncategorized"}
                        </p>
                      </div>

                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          statusBadgeClasses(part.status),
                        ].join(" ")}
                      >
                        {part.status || "unknown"}
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-3 text-sm text-gray-600">
                      {part.description || "No description available."}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
                      <p>SKU: {part.sku || "—"}</p>
                      <p className={stockTone(qty)}>Stock: {qty}</p>
                      <p>Price: {part.price ?? "—"}</p>
                      <p>Slug: {part.slug || "—"}</p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        to={`/parts/${part.id}/edit`}
                        className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        Edit part
                      </Link>

                      <Link
                        to="/media-upload"
                        className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                      >
                        Upload media
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
