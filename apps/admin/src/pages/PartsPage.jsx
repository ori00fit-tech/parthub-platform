import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

const STATUS_OPTIONS = ["pending", "active", "rejected", "archived"];

function normalizeParts(payload) {
  const list =
    payload?.data?.items ||
    payload?.data?.parts ||
    payload?.data ||
    payload?.items ||
    payload?.parts ||
    [];

  return Array.isArray(list) ? list : [];
}

function statusBadge(status) {
  switch (String(status || "").toLowerCase()) {
    case "active":
      return "bg-green-900/30 text-green-300 border-green-800/60";
    case "pending":
      return "bg-yellow-900/30 text-yellow-300 border-yellow-800/60";
    case "rejected":
      return "bg-red-900/30 text-red-300 border-red-800/60";
    case "archived":
      return "bg-gray-800 text-gray-300 border-gray-700";
    default:
      return "bg-blue-900/30 text-blue-300 border-blue-800/60";
  }
}

export default function PartsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") || "pending";

  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [error, setError] = useState("");

  async function loadParts() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/api/v1/admin/parts?status=${encodeURIComponent(status)}`);
      setParts(normalizeParts(res));
    } catch (err) {
      setParts([]);
      setError(err?.message || "Failed to load parts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadParts();
  }, [status]);

  async function updateStatus(id, nextStatus) {
    try {
      setWorkingId(id);
      setError("");
      await api.patch(`/api/v1/admin/parts/${id}/status`, {
        status: nextStatus,
      });
      await loadParts();
    } catch (err) {
      setError(err?.message || "Failed to update part status");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-gray-800 bg-gradient-to-br from-gray-900 via-slate-950 to-blue-950 p-6 text-white shadow-xl sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
              Parts moderation
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">Marketplace parts</h1>
            <p className="mt-3 text-sm text-gray-300 sm:text-base">
              Review submitted listings, approve valid parts, reject bad entries, or archive outdated ones.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/categories"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
            >
              Categories
            </Link>
            <Link
              to="/sellers"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Sellers
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option}
            onClick={() => setSearchParams({ status: option })}
            className={[
              "rounded-2xl border px-4 py-2 text-sm font-medium transition",
              status === option
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800",
            ].join(" ")}
          >
            {option}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-900/50 bg-red-950/20 p-6 text-red-300 shadow-sm">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 text-sm text-gray-400 shadow-sm">
          Loading parts...
        </div>
      ) : parts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-700 bg-gray-900 p-10 text-center shadow-sm">
          <div className="text-5xl mb-4">🔩</div>
          <h2 className="text-2xl font-bold text-gray-100">No parts found</h2>
          <p className="mt-2 text-sm text-gray-400">
            No parts are currently available for the selected moderation status.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {parts.map((part) => (
            <article
              key={part.id}
              className="rounded-3xl border border-gray-800 bg-gray-900 p-5 shadow-sm transition hover:border-blue-800"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-100">
                      {part.title || "Untitled part"}
                    </h3>
                    <span
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-semibold",
                        statusBadge(part.status),
                      ].join(" ")}
                    >
                      {part.status || "unknown"}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-gray-400 sm:grid-cols-2 xl:grid-cols-3">
                    <p>Seller: {part.seller_name || "—"}</p>
                    <p>Slug: {part.slug || "—"}</p>
                    <p>SKU: {part.sku || "—"}</p>
                    <p>Price: {part.price ?? "—"}</p>
                    <p>Stock: {part.quantity ?? "—"}</p>
                    <p>Created: {part.created_at || "—"}</p>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-gray-300">
                    {part.description || "No description available."}
                  </p>
                </div>

                <div className="flex flex-col gap-2 xl:min-w-[180px]">
                  <button
                    onClick={() => updateStatus(part.id, "active")}
                    disabled={workingId === part.id}
                    className="rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500 disabled:opacity-60"
                  >
                    {workingId === part.id ? "Updating..." : "Approve"}
                  </button>

                  <button
                    onClick={() => updateStatus(part.id, "rejected")}
                    disabled={workingId === part.id}
                    className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
                  >
                    {workingId === part.id ? "Updating..." : "Reject"}
                  </button>

                  <button
                    onClick={() => updateStatus(part.id, "archived")}
                    disabled={workingId === part.id}
                    className="rounded-2xl bg-gray-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-600 disabled:opacity-60"
                  >
                    {workingId === part.id ? "Updating..." : "Archive"}
                  </button>

                  <Link
                    to={`/parts/${part.id}`}
                    className="rounded-2xl border border-gray-700 bg-gray-950 px-4 py-2 text-center text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
                  >
                    View details
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
