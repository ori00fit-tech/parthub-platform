import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

function normalizeReviews(payload) {
  const list =
    payload?.data?.items ||
    payload?.data?.reviews ||
    payload?.data ||
    payload?.items ||
    payload?.reviews ||
    [];

  return Array.isArray(list) ? list : [];
}

function renderStars(value) {
  const rating = Math.max(0, Math.min(5, Number(value || 0)));
  const full = Math.round(rating);

  return Array.from({ length: 5 }).map((_, index) => (
    <span key={index} className={index < full ? "text-amber-400" : "text-gray-700"}>
      ★
    </span>
  ));
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  async function loadReviews() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/v1/admin/reviews");
      setReviews(normalizeReviews(res));
    } catch (err) {
      setReviews([]);
      setError(err?.message || "Failed to load pending reviews");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, []);

  const filteredReviews = useMemo(() => {
    const q = query.trim().toLowerCase();

    return reviews.filter((review) => {
      const haystack = [
        review.id,
        review.buyer_name,
        review.part_title,
        review.comment,
        review.content,
        review.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !q || haystack.includes(q);
    });
  }, [reviews, query]);

  async function updateStatus(id, status) {
    try {
      setWorkingId(id);
      setError("");

      await api.patch(`/api/v1/admin/reviews/${id}/status`, { status });

      setReviews((prev) => prev.filter((review) => String(review.id) !== String(id)));
    } catch (err) {
      setError(err?.message || "Failed to update review status");
    } finally {
      setWorkingId(null);
    }
  }

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 text-sm text-gray-400 shadow-sm">
          Loading pending reviews...
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-gray-800 bg-gradient-to-br from-gray-900 via-slate-950 to-blue-950 p-6 text-white shadow-xl sm:p-8">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
            Reviews moderation
          </div>
          <h1 className="text-3xl font-bold sm:text-5xl">Pending reviews</h1>
          <p className="mt-3 text-sm text-gray-300 sm:text-base">
            Review buyer feedback before it becomes publicly visible across the marketplace.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-900/50 bg-red-950/20 p-6 text-red-300 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search buyer, part, content, review id..."
            className="h-12 rounded-2xl border border-gray-700 bg-gray-950 px-4 text-sm text-gray-100 outline-none focus:border-blue-500"
          />

          <button
            type="button"
            onClick={() => setQuery("")}
            className="h-12 rounded-2xl border border-gray-700 bg-gray-950 px-4 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
          >
            Reset
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-400">
          <span className="font-semibold text-gray-100">{filteredReviews.length}</span> pending reviews
        </div>
      </div>

      {filteredReviews.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-700 bg-gray-900 p-10 text-center shadow-sm">
          <div className="text-5xl mb-4">⭐</div>
          <h2 className="text-2xl font-bold text-gray-100">No pending reviews</h2>
          <p className="mt-2 text-sm text-gray-400">
            The moderation queue is currently clear.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <article
              key={review.id}
              className="rounded-3xl border border-gray-800 bg-gray-900 p-5 shadow-sm transition hover:border-blue-800"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-100">
                      {review.part_title || "Part review"}
                    </h3>

                    <div className="flex items-center gap-1 text-lg">
                      {renderStars(review.rating)}
                    </div>

                    <span className="rounded-full border border-amber-800/60 bg-amber-900/30 px-3 py-1 text-xs font-semibold text-amber-300">
                      {Number(review.rating || 0).toFixed(1)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-gray-400 sm:grid-cols-2 xl:grid-cols-3">
                    <p>Review ID: {review.id || "—"}</p>
                    <p>Buyer: {review.buyer_name || "—"}</p>
                    <p>Created: {review.created_at || "—"}</p>
                  </div>

                  <div className="mt-4 rounded-2xl bg-gray-950 p-4 text-sm leading-6 text-gray-300">
                    {review.comment || review.content || "No written content available for this review."}
                  </div>
                </div>

                <div className="flex flex-col gap-2 xl:min-w-[180px]">
                  <button
                    onClick={() => updateStatus(review.id, "approved")}
                    disabled={workingId === review.id}
                    className="rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500 disabled:opacity-60"
                  >
                    {workingId === review.id ? "Updating..." : "Approve"}
                  </button>

                  <button
                    onClick={() => updateStatus(review.id, "rejected")}
                    disabled={workingId === review.id}
                    className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
                  >
                    {workingId === review.id ? "Updating..." : "Reject"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
