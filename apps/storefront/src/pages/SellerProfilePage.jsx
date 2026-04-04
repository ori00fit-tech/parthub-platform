import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiGet } from "../lib/api";
import { formatPriceGBP } from "../lib/formatters";

function getSellerBadges(seller) {
  const badges = [];

  if (Number(seller?.fitment_ready_parts_count || 0) > 0) {
    badges.push({
      label: "Fitment-ready seller",
      className: "bg-indigo-50 text-indigo-700",
    });
  }

  if (Number(seller?.active_parts_count || 0) >= 5) {
    badges.push({
      label: "Well stocked",
      className: "bg-emerald-50 text-emerald-700",
    });
  }

  badges.push({
    label: "Active seller",
    className: "bg-amber-50 text-amber-700",
  });

  return badges.slice(0, 3);
}

function getPartBadges(part) {
  const badges = [];

  if (Number(part?.compatibility_count || 0) >= 3) {
    badges.push({
      label: "Strong compatibility",
      className: "bg-blue-50 text-blue-700",
    });
  } else if (Number(part?.compatibility_count || 0) > 0) {
    badges.push({
      label: "Compatibility added",
      className: "bg-sky-50 text-sky-700",
    });
  }

  if (Number(part?.featured || 0) === 1) {
    badges.push({
      label: "Featured",
      className: "bg-amber-50 text-amber-700",
    });
  }

  if (Number(part?.quantity || 0) >= 5) {
    badges.push({
      label: "In stock",
      className: "bg-emerald-50 text-emerald-700",
    });
  }

  return badges.slice(0, 3);
}

export default function SellerProfilePage() {
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
        setError(err?.message || "Failed to load seller profile");
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
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        Loading seller profile...
      </div>
    );
  }

  if (error || !seller) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
        {error || "Seller not found"}
      </div>
    );
  }

  return (
    <section className="space-y-6 pb-16">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              Seller profile
            </div>

            <h1 className="text-3xl font-bold sm:text-5xl">{seller.name}</h1>

            <p className="mt-3 text-sm text-indigo-100 sm:text-base">
              Browse this seller’s active inventory and trust signals before purchase.
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
            {Number(seller.active_parts_count || 0)} active part{Number(seller.active_parts_count || 0) === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">About this seller</h2>

            <div className="mt-5 space-y-4 text-sm text-gray-600">
              <p>
                <span className="font-semibold text-gray-900">Location:</span>{" "}
                {seller.location || "Not specified"}
              </p>

              {seller.phone ? (
                <p>
                  <span className="font-semibold text-gray-900">Phone:</span>{" "}
                  {seller.phone}
                </p>
              ) : null}

              <p>
                <span className="font-semibold text-gray-900">Active listings:</span>{" "}
                {seller.active_parts_count || 0}
              </p>

              <p>
                <span className="font-semibold text-gray-900">Fitment-ready listings:</span>{" "}
                {seller.fitment_ready_parts_count || 0}
              </p>
            </div>

            <div className="mt-5 rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">Seller description</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {seller.description || "No seller description available yet."}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">Why this seller may be trusted</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <p>• Active inventory indicates this seller is currently participating in the marketplace.</p>
              <p>• Fitment-ready listings usually reduce buyer hesitation and improve part matching.</p>
              <p>• Stock visibility and structured compatibility are stronger trust signals than title alone.</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Seller inventory</h2>
              <p className="mt-1 text-sm text-gray-500">
                Active marketplace listings from this seller.
              </p>
            </div>
          </div>

          {parts.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
              No active parts found for this seller.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {parts.map((part) => (
                <Link
                  key={part.id}
                  to={`/parts/${part.slug}`}
                  className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="bg-gray-100">
                    {part.image_url ? (
                      <img
                        src={part.image_url}
                        alt={part.title}
                        className="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-44 items-center justify-center text-sm text-gray-400">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 p-4">
                    <div>
                      <h3 className="line-clamp-2 text-base font-bold text-gray-900">
                        {part.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {part.brand_name || "Brand unavailable"}
                        {part.category_name ? ` • ${part.category_name}` : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
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
                        <p className="text-xl font-bold text-gray-900">
                          {formatPriceGBP(part.price)}
                        </p>
                        {part.compare_price ? (
                          <p className="text-xs text-gray-400 line-through">
                            {formatPriceGBP(part.compare_price)}
                          </p>
                        ) : null}
                      </div>

                      <div className="text-right text-xs text-gray-500">
                        <p>{Number(part.quantity || 0) > 0 ? `${part.quantity} in stock` : "Out of stock"}</p>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-3">
                      <span className="text-sm font-semibold text-blue-700">
                        View part
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
