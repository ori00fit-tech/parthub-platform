import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiGet } from "../lib/api";
import { formatPrice } from "../lib/formatters";
import { t, useT } from "../i18n";

function getSellerBadges(seller) {
  const badges = [];

  if (Number(seller?.fitment_ready_parts_count || 0) > 0) {
    badges.push({
      label: t("Fitment-ready seller"),
      className: "bg-navy/[0.06] text-link",
    });
  }

  if (Number(seller?.active_parts_count || 0) >= 5) {
    badges.push({
      label: t("Well stocked"),
      className: "bg-emerald-400/10 text-emerald-700",
    });
  }

  badges.push({
    label: t("Active seller"),
    className: "bg-amber-400/10 text-amber-700",
  });

  return badges.slice(0, 3);
}

function getPartBadges(part) {
  const badges = [];

  if (Number(part?.compatibility_count || 0) >= 3) {
    badges.push({
      label: t("Strong compatibility"),
      className: "bg-navy/[0.06] text-link",
    });
  } else if (Number(part?.compatibility_count || 0) > 0) {
    badges.push({
      label: t("Compatibility added"),
      className: "bg-navy/[0.06] text-link",
    });
  }

  if (Number(part?.featured || 0) === 1) {
    badges.push({
      label: t("Featured"),
      className: "bg-amber-400/10 text-amber-700",
    });
  }

  if (Number(part?.quantity || 0) >= 5) {
    badges.push({
      label: t("In stock"),
      className: "bg-emerald-400/10 text-emerald-700",
    });
  }

  return badges.slice(0, 3);
}


function getSellerTypeLabel(sellerType) {
  const value = String(sellerType || "").toLowerCase();

  if (value === "breaker") return t("Breaker");
  if (value === "importer") return t("Importer");
  return t("Parts Shop");
}

function getPartOriginLabel(partOrigin) {
  const value = String(partOrigin || "").toLowerCase();

  if (value === "oem") return t("OEM Genuine");
  if (value === "used") return t("Used Part");
  return t("Aftermarket");
}

export default function SellerProfilePage() {
  const t = useT();
  const { slug } = useParams();
  const [seller, setSeller] = useState(null);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSeller() {
      try {
        setLoading(true);
        setError("");

        const res = await apiGet(`/api/v1/storefront/sellers/${slug}`);
        if (!active) return;

        const nextSeller = res?.data || null;
        setSeller(nextSeller);
        setParts(Array.isArray(nextSeller?.parts) ? nextSeller.parts : []);
      } catch (err) {
        if (!active) return;
        setError(err?.message || t("Failed to load seller profile"));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSeller();

    return () => {
      active = false;
    };
  }, [slug]);

  const sellerBadges = useMemo(
    () => getSellerBadges(seller || {}),
    [seller]
  );

  if (loading) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
        {t("Loading seller profile...")}
      </div>
    );
  }

  if (error || !seller) {
    return (
      <div className="rounded-3xl border border-red-400/30 bg-red-400/10 p-6 text-red-700 shadow-sm">
        {error || t("Seller not found")}
      </div>
    );
  }

  return (
    <section className="space-y-6 pb-16">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              {t("Seller profile")}
            </div>

            <h1 className="text-3xl font-bold sm:text-5xl">{seller.name}</h1>

            <p className="mt-3 text-sm text-indigo-100 sm:text-base">
              {t("Browse this seller’s active inventory and trust signals before purchase.")}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {sellerBadges.map((badge) => (
                <span
                  key={badge.label}
                  className={[
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    badge.className,
                  ].join(" ")}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-sm text-white">
            {Number(seller.active_parts_count || 0) === 1 ? t("1 active part") : t("{n} active parts", { n: Number(seller.active_parts_count || 0) })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-ink">{t("About this seller")}</h2>

            <div className="mt-5 space-y-4 text-sm text-muted">
              <p>
                <span className="font-semibold text-ink">{t("Seller type:")}</span>{" "}
                {getSellerTypeLabel(seller.seller_type)}
              </p>

              <p>
                <span className="font-semibold text-ink">{t("Location:")}</span>{" "}
                {seller.location || t("Not specified")}
              </p>

              {seller.phone ? (
                <p>
                  <span className="font-semibold text-ink">{t("Phone:")}</span>{" "}
                  {seller.phone}
                </p>
              ) : null}

              <p>
                <span className="font-semibold text-ink">{t("Active listings:")}</span>{" "}
                {seller.active_parts_count || 0}
              </p>

              <p>
                <span className="font-semibold text-ink">{t("Fitment-ready listings:")}</span>{" "}
                {seller.fitment_ready_parts_count || 0}
              </p>
            </div>

            <div className="mt-5 rounded-2xl bg-surface-2 p-4">
              <p className="text-sm font-semibold text-ink">{t("Seller description")}</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                {seller.description || t("No seller description available yet.")}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-ink">{t("Why this seller may be trusted")}</h2>
            <div className="mt-4 space-y-3 text-sm text-muted">
              <p>{t("• Active inventory indicates this seller is currently participating in the marketplace.")}</p>
              <p>{t("• Fitment-ready listings usually reduce buyer hesitation and improve part matching.")}</p>
              <p>{t("• Stock visibility and structured compatibility are stronger trust signals than title alone.")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-ink">{t("Seller inventory")}</h2>
              <p className="mt-1 text-sm text-muted">
                {t("Active marketplace listings from this seller.")}
              </p>
            </div>
          </div>

          {parts.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-line-strong bg-surface-2 p-5 text-sm text-muted">
              {t("No active parts found for this seller.")}
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {parts.map((part) => (
                <Link
                  key={part.id}
                  to={`/parts/${part.slug}`}
                  className="group overflow-hidden rounded-3xl border border-line bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="bg-surface-2">
                    {part.image_url ? (
                      <img
                        src={part.image_url}
                        alt={part.title}
                        className="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-44 items-center justify-center text-sm text-faint">
                        {t("No image")}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 p-4">
                    <div>
                      <h3 className="line-clamp-2 text-base font-bold text-ink">
                        {part.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted">
                        {part.brand_name || t("Brand unavailable")}
                        {part.category_name ? ` • ${t(part.category_name)}` : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-navy/[0.06] px-3 py-1 text-[11px] font-semibold text-link">
                        {getPartOriginLabel(part.part_origin)}
                      </span>

                      {getPartBadges(part).map((badge) => (
                        <span
                          key={badge.label}
                          className={[
                            "rounded-full px-3 py-1 text-[11px] font-semibold",
                            badge.className,
                          ].join(" ")}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xl font-bold text-ink">
                          {formatPrice(part.price)}
                        </p>
                        {part.compare_price ? (
                          <p className="text-xs text-faint line-through">
                            {formatPrice(part.compare_price)}
                          </p>
                        ) : null}
                      </div>

                      <div className="text-end text-xs text-muted">
                        <p>{Number(part.quantity || 0) > 0 ? t("{n} in stock", { n: part.quantity }) : t("Out of stock")}</p>
                      </div>
                    </div>

                    <div className="border-t border-line pt-3">
                      <span className="text-sm font-semibold text-link">
                        {t("View part")}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
