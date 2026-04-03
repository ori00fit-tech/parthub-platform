import { useEffect, useState } from "react";
import { api } from "../lib/api";

function normalizeRows(payload) {
  return Array.isArray(payload?.data) ? payload.data : [];
}

export default function ReviewsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRows() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/v1/admin/reviews");
      setRows(normalizeRows(res));
    } catch (err) {
      setError(err?.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, []);

  async function moderate(id, status) {
    try {
      await api.patch(`/api/v1/admin/reviews/${id}/status`, { status });
      await loadRows();
    } catch (err) {
      setError(err?.message || "Failed to update review status");
    }
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-fuchsia-700 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">Review moderation</h1>
        <p className="mt-3 text-sm text-fuchsia-100 sm:text-base">
          Approve real buyer feedback and reject low-quality or policy-breaking reviews.
        </p>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading reviews...</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No pending reviews right now.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.map((review) => (
              <div key={review.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-gray-900">
                      {review.part_title || "Unknown part"}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      buyer: {review.buyer_name || "unknown"} • rating: {review.rating}/5
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      {review.body || review.comment || "No review text provided."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => moderate(review.id, "approved")}
                      className="inline-flex h-10 items-center justify-center rounded-2xl bg-green-600 px-4 text-sm font-semibold text-white transition hover:bg-green-700"
                    >
                      Approve
                    </button>

                    <button
                      type="button"
                      onClick={() => moderate(review.id, "rejected")}
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
