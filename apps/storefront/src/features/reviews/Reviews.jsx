import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@parthub/shared/icons";
import { apiPost } from "../../lib/api";
import { dateLocale, useT } from "../../i18n";

// Ratings come from the API as { count, average } over approved reviews only.

export function Stars({ value = 0, className = "h-4 w-4" }) {
  const full = Math.round(Number(value) || 0);
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="featured" className={[className, i <= full ? "fill-current" : "text-line-strong"].join(" ")} strokeWidth={1.75} />
      ))}
    </span>
  );
}

// "★★★★☆ 4.5 · 3 reviews" or "No reviews yet".
export function RatingSummary({ rating, className = "" }) {
  const t = useT();
  const count = Number(rating?.count || 0);
  if (!count) return <span className={["text-sm text-muted", className].join(" ")}>{t("No reviews yet")}</span>;
  const avg = Number(rating.average).toLocaleString(dateLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const label = count === 1 ? t("{avg} out of 5, 1 review", { avg }) : t("{avg} out of 5, {n} reviews", { avg, n: count });
  return (
    <span className={["inline-flex flex-wrap items-center gap-1.5 text-sm", className].join(" ")} aria-label={label}>
      <Stars value={rating.average} />
      <span className="font-semibold text-ink">{avg}</span>
      <span className="text-muted">· {count === 1 ? t("1 review") : t("{n} reviews", { n: count })}</span>
    </span>
  );
}

function formatDate(value) {
  const d = new Date(`${String(value || "").replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(dateLocale(), { year: "numeric", month: "short" });
}

export function ReviewList({ reviews = [], showPart = false }) {
  const t = useT();
  if (!reviews.length) return <p className="text-sm text-muted">{t("No reviews yet. Reviews come from buyers who received the part.")}</p>;
  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-2xl border border-line bg-surface-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Stars value={r.rating} />
            <span dir="auto" className="text-sm font-semibold text-ink">{r.author || t("Buyer")}</span>
            {r.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                <Icon name="verified" className="h-3.5 w-3.5" />
                {t("Verified purchase")}
              </span>
            ) : null}
            <span className="ms-auto text-xs text-faint">{formatDate(r.created_at)}</span>
          </div>
          {r.body ? <p dir="auto" className="mt-2 whitespace-pre-line text-sm text-ink-2">{r.body}</p> : null}
          {showPart && r.part_slug ? (
            <Link to={`/parts/${r.part_slug}`} className="mt-2 inline-block text-xs font-semibold text-link hover:underline">
              {r.part_title}
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

// Rate a delivered part: 1–5 stars and an optional comment.
export function ReviewForm({ partId, onDone }) {
  const t = useT();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!rating) return setError(t("Choose 1 to 5 stars."));
    setSaving(true);
    setError("");
    try {
      await apiPost("/api/v1/commerce/reviews", { part_id: partId, rating, body: body.trim() }, { auth: true });
      onDone?.(rating);
    } catch (err) {
      setError(err?.message || t("Something went wrong. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  const shown = hover || rating;
  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-2xl border border-line bg-surface-2 p-4">
      <div role="radiogroup" aria-label={t("Your rating")} className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={rating === i}
            aria-label={i === 1 ? t("1 star") : t("{n} stars", { n: i })}
            onClick={() => setRating(i)}
            onMouseEnter={() => setHover(i)}
            className="rounded-lg p-1 text-amber-500 transition hover:scale-110"
          >
            <Icon name="featured" className={["h-7 w-7", i <= shown ? "fill-current" : "text-line-strong"].join(" ")} />
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder={t("Did it fit? Was it as described? (optional)")}
        className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-sky-400"
      />
      {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
      <button type="submit" disabled={saving} className="btn-cta h-10 rounded-xl px-5 text-sm">
        {saving ? t("Saving…") : t("Send review")}
      </button>
    </form>
  );
}

// Under a delivered order item: the buyer's review (with its moderation status) or a "Rate this part" button.
export function ItemReview({ item }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState(
    item.my_rating ? { rating: Number(item.my_rating), status: item.my_review_status || "pending" } : null
  );

  if (mine) {
    const note =
      mine.status === "approved"
        ? t("Published")
        : mine.status === "rejected"
          ? t("Not published")
          : t("Waiting for review by our team");
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-ink-2">{t("Your rating")}:</span>
        <Stars value={mine.rating} className="h-3.5 w-3.5" />
        <span className="text-muted">· {note}</span>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-link hover:underline">
        <Icon name="featured" className="h-3.5 w-3.5" />
        {t("Rate this part")}
      </button>
    );
  }

  return <ReviewForm partId={item.part_id} onDone={(rating) => setMine({ rating, status: "pending" })} />;
}
