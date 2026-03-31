import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiGet } from "../lib/api";
import { formatPriceGBP } from "../lib/formatters";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";
import { useCart } from "../features/cart/CartContext";

function normalizeGallery(part) {
  const candidates = [
    ...(Array.isArray(part?.media) ? part.media : []),
    ...(Array.isArray(part?.images) ? part.images : []),
  ];

  const fromArrays = candidates
    .map((item) => {
      if (typeof item === "string") {
        return { url: item, alt: part?.title || "Part image" };
      }

      return {
        url: item?.url || item?.image_url || item?.src || "",
        alt: item?.alt || part?.title || "Part image",
      };
    })
    .filter((item) => item.url);

  const fallback = part?.image_url
    ? [{ url: part.image_url, alt: part?.title || "Part image" }]
    : [];

  return fromArrays.length ? fromArrays : fallback;
}

function normalizeSpecs(part) {
  const rawSpecs = part?.specs || part?.attributes || part?.technical_specs || null;

  if (Array.isArray(rawSpecs)) {
    return rawSpecs
      .map((item) => ({
        label: item?.label || item?.name || item?.key || "",
        value: item?.value || item?.content || "",
      }))
      .filter((item) => item.label && item.value);
  }

  if (rawSpecs && typeof rawSpecs === "object") {
    return Object.entries(rawSpecs)
      .map(([key, value]) => ({
        label: key,
        value: Array.isArray(value) ? value.join(", ") : String(value ?? ""),
      }))
      .filter((item) => item.label && item.value);
  }

  const fallback = [
    ["Brand", part?.brand_name],
    ["Category", part?.category_name],
    ["SKU", part?.sku],
    ["Condition", part?.condition],
    ["Location", part?.seller_location],
  ];

  return fallback
    .filter(([, value]) => value)
    .map(([label, value]) => ({ label, value }));
}

function extractFitmentText(part) {
  if (Array.isArray(part?.fitment_notes) && part.fitment_notes.length) {
    return part.fitment_notes.join(" • ");
  }

  if (typeof part?.fitment_notes === "string" && part.fitment_notes.trim()) {
    return part.fitment_notes;
  }

  if (typeof part?.fitment_text === "string" && part.fitment_text.trim()) {
    return part.fitment_text;
  }

  return "";
}

function detectFitmentStatus(part, selectedVehicle) {
  if (!selectedVehicle) {
    return {
      tone: "neutral",
      title: "Select your vehicle to check fitment context",
      description:
        "Vehicle-aware fitment messaging becomes stronger once a make, model, and year are selected.",
    };
  }

  const haystack = [
    part?.fitment_text,
    part?.fitment_notes,
    part?.description,
    part?.title,
    part?.sku,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const make = String(selectedVehicle?.make_name || selectedVehicle?.make || "").toLowerCase();
  const model = String(selectedVehicle?.model_name || selectedVehicle?.model || "").toLowerCase();
  const year = String(selectedVehicle?.year || "").toLowerCase();

  const matchesMake = make && haystack.includes(make);
  const matchesModel = model && haystack.includes(model);
  const matchesYear = year && haystack.includes(year);

  if (matchesMake && (matchesModel || matchesYear)) {
    return {
      tone: "positive",
      title: "Potential fitment match for your selected vehicle",
      description:
        "This part appears aligned with your current vehicle context. Final confirmation should still rely on full fitment data or OEM reference.",
    };
  }

  if (matchesMake || matchesModel || matchesYear) {
    return {
      tone: "warning",
      title: "Partial fitment signal detected",
      description:
        "Some of your vehicle details appear related, but the match is not fully clear yet.",
    };
  }

  return {
    tone: "neutral",
    title: "Fitment not confirmed for your selected vehicle",
    description:
      "Use SKU, OEM reference, product notes, and full compatibility data before purchase.",
  };
}

function toneClasses(tone) {
  switch (tone) {
    case "positive":
      return "border-green-200 bg-green-50 text-green-800";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "neutral":
    default:
      return "border-blue-200 bg-blue-50 text-blue-800";
  }
}

export default function PartDetailsPage() {
  const { slug } = useParams();
  const { selectedVehicle } = useSelectedVehicle();
  const { addItem, totalItems } = useCart();

  const [part, setPart] = useState(null);
  const [relatedParts, setRelatedParts] = useState([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPart() {
      try {
        setLoading(true);
        setError("");
        setAdded(false);

        const partRes = await apiGet(`/api/v1/catalog/parts/${slug}`);
        if (!active) return;

        const nextPart = partRes?.data || null;
        setPart(nextPart);
        setGalleryIndex(0);

        const relatedSource =
          nextPart?.similar_parts ||
          nextPart?.related_parts ||
          partRes?.meta?.related_parts ||
          [];

        if (Array.isArray(relatedSource)) {
          setRelatedParts(relatedSource.slice(0, 4));
        } else {
          setRelatedParts([]);
        }
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load part details");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPart();

    return () => {
      active = false;
    };
  }, [slug]);

  const gallery = useMemo(() => normalizeGallery(part), [part]);
  const specs = useMemo(() => normalizeSpecs(part), [part]);
  const fitment = useMemo(
    () => detectFitmentStatus(part, selectedVehicle),
    [part, selectedVehicle]
  );
  const fitmentText = useMemo(() => extractFitmentText(part), [part]);

  const activeImage = gallery[galleryIndex] || gallery[0] || null;
  const stock = Number(part?.quantity || 0);
  const inStock = stock > 0;

  function handleQuantityChange(next) {
    const normalized = Math.max(1, Math.min(99, Number(next || 1)));
    setQuantity(normalized);
  }

  function handleAddToCart() {
    if (!part || !inStock) return;

    setAdding(true);
    try {
      addItem(
        {
          id: part.id,
          part_id: part.id,
          slug: part.slug,
          title: part.title,
          thumbnail: activeImage?.url || part.image_url || null,
          image_url: activeImage?.url || part.image_url || null,
          seller_name: part.seller_name || "",
          price: part.price,
        },
        quantity
      );

      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        Loading part details...
      </div>
    );
  }

  if (error || !part) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
        {error || "Part not found"}
      </div>
    );
  }

  return (
    <section className="space-y-6 pb-24 lg:pb-10">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <Link to="/" className="hover:text-gray-700">Home</Link>
        <span>•</span>
        <Link to="/parts" className="hover:text-gray-700">Parts</Link>
        {part.category_slug ? (
          <>
            <span>•</span>
            <Link to={`/parts?category=${part.category_slug}`} className="hover:text-gray-700">
              {part.category_name || "Category"}
            </Link>
          </>
        ) : null}
        <span>•</span>
        <span className="text-gray-700">{part.title}</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
            <div className="bg-gray-100">
              {activeImage ? (
                <img
                  src={activeImage.url}
                  alt={activeImage.alt}
                  className="h-[320px] w-full object-cover sm:h-[420px]"
                />
              ) : (
                <div className="flex h-[320px] items-center justify-center text-sm text-gray-400 sm:h-[420px]">
                  No image available
                </div>
              )}
            </div>

            {gallery.length > 1 ? (
              <div className="grid grid-cols-4 gap-3 p-4 sm:grid-cols-5">
                {gallery.map((image, index) => (
                  <button
                    key={`${image.url}-${index}`}
                    type="button"
                    onClick={() => setGalleryIndex(index)}
                    className={[
                      "overflow-hidden rounded-2xl border bg-gray-50 transition",
                      index === galleryIndex
                        ? "border-blue-500 ring-2 ring-blue-100"
                        : "border-gray-200 hover:border-gray-300",
                    ].join(" ")}
                  >
                    <img
                      src={image.url}
                      alt={image.alt}
                      className="h-20 w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className={`rounded-3xl border p-5 shadow-sm ${toneClasses(fitment.tone)}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{fitment.title}</h2>
                <p className="mt-1 text-sm">{fitment.description}</p>
              </div>

              {selectedVehicle ? (
                <Link
                  to="/vehicle-selector"
                  className="rounded-2xl border border-current/20 bg-white/70 px-4 py-2 text-sm font-semibold"
                >
                  Change vehicle
                </Link>
              ) : (
                <Link
                  to="/vehicle-selector"
                  className="rounded-2xl border border-current/20 bg-white/70 px-4 py-2 text-sm font-semibold"
                >
                  Select vehicle
                </Link>
              )}
            </div>

            {selectedVehicle ? (
              <div className="mt-4 rounded-2xl bg-white/70 px-4 py-3 text-sm">
                Current vehicle:{" "}
                <span className="font-semibold">
                  {selectedVehicle.label}
                </span>
              </div>
            ) : null}

            {fitmentText ? (
              <div className="mt-4 rounded-2xl bg-white/70 px-4 py-3 text-sm">
                <span className="font-semibold">Fitment notes:</span> {fitmentText}
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Description</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-gray-600">
              {part.description || "No description available for this part yet."}
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Technical details</h2>
            {specs.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {specs.map((spec) => (
                  <div key={`${spec.label}-${spec.value}`} className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      {spec.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {spec.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                Technical details will appear here as richer product data becomes available.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap gap-2">
                  {part.condition ? (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {part.condition}
                    </span>
                  ) : null}
                  {inStock ? (
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                      In stock
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                      Out of stock
                    </span>
                  )}
                </div>

                <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900">
                  {part.title}
                </h1>

                <p className="mt-2 text-sm text-gray-500">
                  {part.brand_name || "Unknown brand"} • {part.category_name || "Uncategorized"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-4xl font-bold text-gray-900">
                  {formatPriceGBP(part.price)}
                </p>
                {part.compare_price ? (
                  <p className="mt-1 text-sm text-gray-400 line-through">
                    {formatPriceGBP(part.compare_price)}
                  </p>
                ) : null}
              </div>

              <div className="text-right text-sm text-gray-500">
                <p>Stock: {stock}</p>
                {part.sku ? <p>SKU: {part.sku}</p> : null}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-[120px_1fr]">
              <div className="flex h-12 items-center rounded-2xl border border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  className="h-full w-12 text-lg text-gray-700 hover:bg-gray-50"
                >
                  −
                </button>
                <input
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  className="h-full w-full border-x border-gray-200 text-center text-sm font-semibold text-gray-900 outline-none"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  className="h-full w-12 text-lg text-gray-700 hover:bg-gray-50"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!inStock || adding}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {adding ? "Adding..." : inStock ? "Add to cart" : "Unavailable"}
              </button>
            </div>

            {added ? (
              <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Added to cart successfully. Cart now has {totalItems} item{totalItems > 1 ? "s" : ""}.
              </div>
            ) : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Seller</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {part.seller_name || "Marketplace seller"}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Location</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {part.seller_location || "Not specified"}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Category</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {part.category_name || "Uncategorized"}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Reference</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {part.sku || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Buyer reassurance</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="rounded-2xl bg-gray-50 p-4">
                Double-check fitment before checkout, especially for vehicle-specific parts.
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                Use SKU or OEM reference when comparing multiple listings.
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                Vehicle context is stored across storefront pages to reduce wrong-part risk.
              </div>
            </div>
          </div>
        </div>
      </div>

      {relatedParts.length ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Related parts</h2>
              <p className="text-sm text-gray-500">
                Nearby options to continue browsing without leaving the buying flow.
              </p>
            </div>

            <Link to="/parts" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Browse all →
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {relatedParts.map((item) => (
              <article
                key={item.id || item.slug}
                className="rounded-3xl border border-gray-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="overflow-hidden rounded-2xl bg-gray-100">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                      No image
                    </div>
                  )}
                </div>

                <h3 className="mt-4 line-clamp-2 text-base font-semibold text-gray-900">
                  {item.title}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {item.brand_name || "Unknown brand"}
                </p>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <p className="text-lg font-bold text-gray-900">
                    {formatPriceGBP(item.price)}
                  </p>
                  <Link
                    to={`/parts/${item.slug}`}
                    className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    View
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-4 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{part.title}</p>
            <p className="text-base font-bold text-gray-900">{formatPriceGBP(part.price)}</p>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!inStock || adding}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {adding ? "Adding..." : inStock ? "Add to cart" : "Unavailable"}
          </button>
        </div>
      </div>
    </section>
  );
}
