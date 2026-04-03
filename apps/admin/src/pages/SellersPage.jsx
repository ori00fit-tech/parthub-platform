import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

function normalizeRows(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function normalizePagination(payload) {
  const meta = payload?.meta || {};
  return {
    page: Number(meta.page || 1),
    limit: Number(meta.limit || 20),
    total: Number(meta.total || 0),
    totalPages: Number(meta.total_pages || 1),
  };
}

function statusClasses(status) {
  switch (status) {
    case "active":
      return "bg-green-50 text-green-700 border-green-200";
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "rejected":
      return "bg-red-50 text-red-700 border-red-200";
    case "suspended":
      return "bg-gray-100 text-gray-700 border-gray-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export default function SellersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const status = searchParams.get("status") || "";

  async function loadRows(nextStatus = status) {
    try {
      setLoading(true);
      setError("");

      const qs = new URLSearchParams();
      if (nextStatus) qs.set("status", nextStatus);

      const res = await api.get(`/api/v1/admin/sellers${qs.toString() ? `?${qs.toString()}` : ""}`);
      setRows(normalizeRows(res));
      setMeta(normalizePagination(res));
    } catch (err) {
      setError(err?.message || "Failed to load sellers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, [status]);

  async function updateStatus(id, nextStatus) {
    try {
      await api.patch(`/api/v1/admin/sellers/${id}/status`, { status: nextStatus });
      await loadRows();
    } catch (err) {
      setError(err?.message || "Failed to update seller status");
    }
  }

  function setStatusFilter(nextStatus) {
    const qs = new URLSearchParams(searchParams);
    if (nextStatus) qs.set("status", nextStatus);
    else qs.delete("status");
    setSearchParams(qs, { replace: true });
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">Seller moderation</h1>
        <p className="mt-3 text-sm text-blue-100 sm:text-base">
          Review seller onboarding status, approve trusted suppliers, and suspend problematic accounts.
        </p>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {["", "pending", "active", "rejected", "suspended"].map((item) => (
            <button
              key={item || "all"}
              type="button"
              onClick={() => setStatusFilter(item)}
              className={[
                "inline-flex h-10 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition",
                status === item
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
              ].join(" ")}
            >
              {item || "All sellers"}
            </button>
          ))}
        </div>

        <div className="mt-4 text-sm text-gray-500">
          {loading ? "Loading sellers..." : `${meta.total} seller record${meta.total === 1 ? "" : "s"}`}
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading seller moderation queue...</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No sellers found for this filter.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.map((seller) => (
              <div key={seller.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">{seller.name}</h2>
                      <span
                        className={[
                          "rounded-full border px-3 py-1 text-xs font-semibold",
                          statusClasses(seller.status),
                        ].join(" ")}
                      >
                        {seller.status}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      slug: {seller.slug} • email: {seller.email || "unknown"} • phone: {seller.user_phone || "n/a"}
                    </p>

                    <p className="mt-2 text-sm text-gray-600">
                      {seller.description || "No seller description provided yet."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      to={`/sellers/${seller.id}`}
                      className="inline-flex h-10 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                    >
                      View details
                    </Link>

                    <button
                      type="button"
                      onClick={() => updateStatus(seller.id, "active")}
                      className="inline-flex h-10 items-center justify-center rounded-2xl bg-green-600 px-4 text-sm font-semibold text-white transition hover:bg-green-700"
                    >
                      Approve
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus(seller.id, "suspended")}
                      className="inline-flex h-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                    >
                      Suspend
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus(seller.id, "rejected")}
                      className="inline-flex h-10 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
