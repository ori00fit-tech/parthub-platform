import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { formatPrice } from "../lib/formatters";
import { apiGet } from "../lib/api";
import { mediaUrl } from "../lib/media";
import { useAuth } from "../features/auth/AuthContext";
import { FavoriteButton, useFavorites } from "../features/favorites/FavoritesContext";
import { useCart } from "../features/cart/CartContext";
import { useT } from "../i18n";

// /favorites — the parts this buyer saved (API: GET /api/v1/favorites).
export default function FavoritesPage() {
  const t = useT();
  const { isAuthenticated } = useAuth();
  const fav = useFavorites();
  const { addItem } = useCart();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) return;
    apiGet("/api/v1/favorites", undefined, { auth: true })
      .then((r) => setItems(Array.isArray(r?.data) ? r.data : []))
      .catch((err) => setError(err?.message || t("Something went wrong. Please try again.")));
  }, [isAuthenticated]);

  if (!isAuthenticated) return <Navigate to="/auth?redirect=%2Ffavorites" replace />;

  // A part un-saved on this page leaves the list.
  const shown = (items || []).filter((p) => fav?.isSaved(p.id));

  return (
    <section className="mx-auto max-w-5xl space-y-6 pb-16">
      <header>
        <h1 className="text-3xl font-bold text-ink">{t("Saved parts")}</h1>
        <p className="mt-2 text-sm text-muted">{t("Parts you saved to come back to, on every device you sign in with.")}</p>
      </header>
      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
      {items === null && !error ? <p className="text-sm text-muted">{t("Loading...")}</p> : null}
      {items !== null && shown.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-surface p-8 text-center">
          <p className="text-sm text-muted">{t("No saved parts yet. Tap ♥ on a part to find it here.")}</p>
          <Link to="/parts" className="mt-4 inline-block text-sm font-semibold text-link hover:underline">{t("Browse parts")}</Link>
        </div>
      ) : null}
      <ul className="grid gap-4 sm:grid-cols-2">
        {shown.map((p) => (
          <li key={p.id} className="flex gap-4 rounded-3xl border border-line bg-surface p-4 shadow-sm">
            <Link to={`/parts/${p.slug}`} className="h-24 w-24 flex-none overflow-hidden rounded-2xl bg-surface-2">
              {p.image_url ? <img src={mediaUrl(p.image_url)} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
            </Link>
            <div className="min-w-0 flex-1">
              <Link to={`/parts/${p.slug}`} dir="auto" className="line-clamp-2 font-semibold text-ink hover:underline">{p.title}</Link>
              <p className="mt-1 text-xs text-muted">{p.seller_name}{p.seller_location ? ` · ${p.seller_location}` : ""}</p>
              <p className="mt-2 font-mono text-lg font-semibold text-ink">
                {p.pro_price ? <span className="text-emerald-800">{formatPrice(p.pro_price)} <span className="font-sans text-xs">{t("Pro price")}</span></span> : formatPrice(p.price)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {Number(p.available) === 1 && Number(p.quantity) > 0 ? (
                  <button
                    type="button"
                    onClick={() => addItem({ part_id: p.id, slug: p.slug, title: p.title, thumbnail: p.image_url || null, seller_name: p.seller_name || "", price: p.pro_price ?? p.price })}
                    className="btn-cta h-10 rounded-xl px-4 text-sm"
                  >
                    {t("Add to cart")}
                  </button>
                ) : (
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">{t("No longer available")}</span>
                )}
                <FavoriteButton partId={p.id} className="h-10 w-10" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
