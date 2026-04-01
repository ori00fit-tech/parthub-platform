import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
    <span key={index} className={index < full ? "text-amber-400" : "text-gray-300"}>
      ★
    </span>
  ));
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");

  useEffect(() => {
    let active = true;

    async function loadReviews() {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/api/v1/marketplace/me/reviews");
        if (!active) return;
        setReviews(normalizeReviews(res));
      } catch (err) {
        if (!active) return;
        setReviews([]);
        setError(err?.message || "Failed to load seller reviews");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReviews();

    return () => {
      active = false;
    };
  }, []);

  const filteredReviews = useMemo(() => {
    const q = query.trim().toLowerCase();

    return reviews.filter((review) => {
      const haystack = [
        review.buyer_name,
        review.part_title,
        review.title,
        review.comment,
        review.content,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !q || haystack.includes(q);
      const matchesRating =
        !ratingFilter || Number(review.rating || 0) === Number(ratingFilter);

      return matchesQuery && matchesRating;
    });
  }, [reviews, query, ratingFilter]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const avg =
      total > 0
        ? (
            reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / total
          ).toFixed(1)
        : "0.0";

    const fiveStar = reviews.filter((r) => Number(r.rating || 0) === 5).length;
    const lowReviews = reviews.filter((r) => Number(r.rating || 0) <= 2).length;

    return { total, avg, fiveStar, lowReviews };
  }, [reviews]);

  function clearFilters() {
    setQuery("");
    setRatingFilter("");
  }

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading seller reviews...
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
              Reviews foundation
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">Seller reviews</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              Monitor buyer feedback, track rating quality, and review comments tied to your listings.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/parts"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
            >
              Inventory
            </Link>
            <Link
              to="/store-settings"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Store settings
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
          <p className="text-sm text-gray-500">Total reviews</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Average rating</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.avg}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">5-star reviews</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.fiveStar}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Low ratings (≤2)</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.lowReviews}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr_auto]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search buyer, part, or review text..."
            className="h-12 rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
          />

          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="h-12 rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
          >
            <option value="">All ratings</option>
            <option value="5">5 stars</option>
            <option value="4">4 stars</option>
            <option value="3">3 stars</option>
            <option value="2">2 stars</option>
            <option value="1">1 star</option>
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
          <span className="font-semibold text-gray-900">{filteredReviews.length}</span> reviews found
        </div>
      </div>

      {filteredReviews.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <div className="text-5xl">⭐</div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">No reviews yet</h2>
          <p className="mt-2 text-sm text-gray-500">
            Reviews will appear here once buyers start rating your listings.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review, index) => (
            <article
              key={review.id || `${review.buyer_name}-${index}`}
              className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-900">
                      {review.part_title || "Part review"}
                    </h3>

                    <div className="flex items-center gap-1 text-lg">
                      {renderStars(review.rating)}
                    </div>

                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      {Number(review.rating || 0).toFixed(1)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2 xl:grid-cols-3">
                    <p>Buyer: {review.buyer_name || "—"}</p>
                    <p>Email: {review.buyer_email || "—"}</p>
                    <p>Date: {review.created_at || "—"}</p>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-gray-600">
                    {review.comment || review.content || "No written review content."}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
