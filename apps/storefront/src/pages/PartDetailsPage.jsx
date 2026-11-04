import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiGet } from "../lib/api";
import { formatPrice } from "../lib/formatters";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";
import VehicleContextBar from "../features/vehicles/VehicleContextBar";
import { useCart } from "../features/cart/CartContext";

function normalizeGallery(part) {
  const candidates = [
    ...(Array.isArray(part?.media) ? part.media : []),
    ...(Array.isArray(part?.images) ? part.images : []),
  ];

  const items = candidates
    .map((item) => {
      if (typeof item === "string") {
        return { url: item, alt: part?.title || "Part image" };
      }

      return {
        url: item?.url || item?.image_url || item?.src || "",
        alt: item?.alt || item?.alt_text || part?.title || "Part image",
      };
    })
    .filter((item) => item.url);

  if (items.length) return items;

  return part?.image_url
    ? [{ url: part.image_url, alt: part?.title || "Part image" }]
    : [];
}

function normalizeSpecs(part) {
  const rawSpecs = part?.specs || [];

  if (Array.isArray(rawSpecs) && rawSpecs.length) {
    return rawSpecs
      .map((item) => ({
        label: item?.label || item?.name || item?.key || "",
        value: item?.value || item?.content || "",
      }))
      .filter((item) => item.label && item.value);
  }

  const fallback = [
    ["Brand", part?.brand_name],
    ["Category", part?.category_name],
    ["SKU", part?.sku],
    ["Condition", part?.condition],
    ["Location", part?.seller_location],
    ["Weight", part?.weight_kg ? `${part.weight_kg} kg` : ""],
  ];

  return fallback
    .filter(([, value]) => value)
    .map(([label, value]) => ({ label, value }));
}

function normalizeCompatibility(part) {
  return Array.isArray(part?.compatibility) ? part.compatibility : [];
}

function normalizeVehicleContext(ctx) {
  const selectedVehicle = ctx?.selectedVehicle || ctx?.vehicle || null;
  return { selectedVehicle };
}

function getVehicleLabel(vehicle) {
  if (!vehicle) return "";
  return (
    vehicle.label ||
    [
      vehicle.year,
      vehicle.makeName || vehicle.make_name || vehicle.make,
      vehicle.modelName || vehicle.model_name || vehicle.model,
      vehicle.engineName || vehicle.engine_name || vehicle.engine,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function doesVehicleMatch(row, vehicle) {
  if (!row || !vehicle) return false;

  const vehicleMake = String(
    vehicle?.makeName || vehicle?.make_name || vehicle?.make || ""
  ).toLowerCase();

  const vehicleModel = String(
    vehicle?.modelName || vehicle?.model_name || vehicle?.model || ""
  ).toLowerCase();

  const vehicleYear = Number(vehicle?.year || 0);

  const rowMake = String(row?.make || "").toLowerCase();
  const rowModel = String(row?.model || "").toLowerCase();
  const rowYearStart = Number(row?.year_start || 0);
  const rowYearEnd = row?.year_end != null ? Number(row.year_end) : null;

  if (!vehicleMake || !vehicleModel || !vehicleYear) return false;

  const makeMatches = rowMake === vehicleMake;
  const modelMatches = rowModel === vehicleModel;
  const yearMatches =
    vehicleYear >= rowYearStart &&
    (rowYearEnd == null || vehicleYear <= rowYearEnd);

  return makeMatches && modelMatches && yearMatches;
}

function detectFitmentStatus(compatibility, selectedVehicle) {
  if (!selectedVehicle) {
    return {
      tone: "neutral",
      title: "Select your vehicle to confirm fitment",
      description:
        "Choose make, model, and year to verify whether this part matches your vehicle.",
    };
  }

  const exactMatch = compatibility.some((row) =>
    doesVehicleMatch(row, selectedVehicle)
  );

  if (exactMatch) {
    return {
      tone: "positive",
      title: `Fits your ${getVehicleLabel(selectedVehicle)}`,
      description:
        "This part has a compatibility row that matches your selected vehicle.",
    };
  }

  if (compatibility.length > 0) {
    return {
      tone: "warning",
      title: "Compatibility not confirmed for your vehicle",
      description:
        "This part includes compatibility data, but your selected vehicle is not an exact confirmed match.",
    };
  }

  return {
    tone: "neutral",
    title: "No structured compatibility data yet",
    description:
      "Use SKU, seller notes, and product details until compatibility data is expanded.",
  };
}

function toneClasses(tone) {
  switch (tone) {
    case "positive":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-700";
    case "warning":
      return "border-amber-400/30 bg-amber-400/10 text-amber-800";
    default:
      return "border-navy/70 bg-navy/20 text-link";
  }
}

function buildWhatsAppLink(part, selectedVehicle) {
  const vehicleLabel = selectedVehicle ? getVehicleLabel(selectedVehicle) : "No vehicle selected";

  const message = [
    "Hello, I want to confirm this part.",
    `Part: ${part?.title || "Unknown part"}`,
    part?.sku ? `SKU: ${part.sku}` : "",
    `Vehicle: ${vehicleLabel}`,
    part?.slug ? `Part slug: ${part.slug}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export default function PartDetailsPage() {
  const { slug } = useParams();
  const vehicleContext = useSelectedVehicle();
  const { selectedVehicle } = normalizeVehicleContext(vehicleContext);
  const saveVehicle = vehicleContext?.saveVehicle || (() => {});
  const cartContext = useCart() || {};
  const addItem = cartContext.addItem || (() => {});
  const totalItems = cartContext.totalItems || 0;

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

        const response = await apiGet(`/api/v1/catalog/parts/${slug}`);
        if (!active) return;

        const nextPart = response?.data || null;
        setPart(nextPart);
        setGalleryIndex(0);

        const nextRelated = Array.isArray(nextPart?.related_parts)
          ? nextPart.related_parts.slice(0, 4)
          : [];

        setRelatedParts(nextRelated);
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
  const compatibility = useMemo(() => normalizeCompatibility(part), [part]);
  const fitment = useMemo(
    () => detectFitmentStatus(compatibility, selectedVehicle),
    [compatibility, selectedVehicle]
  );
  const whatsappLink = useMemo(
    () => (part ? buildWhatsAppLink(part, selectedVehicle) : "#"),
    [part, selectedVehicle]
  );

  const activeImage = gallery[galleryIndex] || gallery[0] || null;
  const safeRelatedParts = Array.isArray(relatedParts) ? relatedParts : [];
  const stock = Number(part?.quantity || 0);
  const inStock = stock > 0;
  const selectedVehicleMatch = compatibility.some((row) =>
    doesVehicleMatch(row, selectedVehicle)
  );

  function handleQuantityChange(nextValue) {
    const normalized = Math.max(1, Math.min(99, Number(nextValue || 1)));
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
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
        Loading part details...
      </div>
    );
  }

  if (error || !part) {
    return (
      <div className="rounded-3xl border border-red-400/30 bg-red-400/10 p-6 text-red-700 shadow-sm">
        {error || "Part not found"}
      </div>
    );
  }

  return (
    <section className="space-y-6 pb-24">
      <VehicleContextBar />

      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
            {activeImage ? (
              <img
                src={activeImage.url}
                alt={activeImage.alt}
                className="h-[320px] w-full object-cover sm:h-[420px]"
              />
            ) : (
              <div className="flex h-[320px] items-center justify-center bg-surface-2 text-sm text-faint sm:h-[420px]">
                No image available
              </div>
            )}
          </div>

          {gallery.length > 1 ? (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
              {gallery.map((image, index) => (
                <button
                  key={`${image.url}-${index}`}
                  type="button"
                  onClick={() => setGalleryIndex(index)}
                  className={[
                    "overflow-hidden rounded-2xl border bg-surface",
                    galleryIndex === index
                      ? "border-sky-400 ring-2 ring-sky-400/20"
                      : "border-line",
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

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-faint">Condition</p>
              <p className="mt-1 text-sm font-semibold text-ink">{part.condition}</p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-faint">Stock status</p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {inStock ? `${stock} available` : "Out of stock"}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-faint">Compatibility</p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {compatibility.length} row{compatibility.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {part.brand_name ? (
                <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-2">
                  {part.brand_name}
                </span>
              ) : null}

              {part.category_name ? (
                <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-2">
                  {part.category_name}
                </span>
              ) : null}

              <span className="rounded-full bg-navy/20 px-3 py-1 text-xs font-semibold text-link">
                {part.condition}
              </span>

              {selectedVehicleMatch ? (
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Vehicle-matched
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 text-3xl font-bold text-ink">{part.title}</h1>

            <p className="mt-3 text-sm leading-6 text-muted">
              {part.description || "No description available for this part yet."}
            </p>

            <div className="mt-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-bold text-ink">
                  {formatPrice(part.price)}
                </p>
                {part.compare_price ? (
                  <p className="text-sm text-faint line-through">
                    {formatPrice(part.compare_price)}
                  </p>
                ) : null}
              </div>

              <div className="text-right text-sm">
                <p className={inStock ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                  {inStock ? `In stock (${stock})` : "Out of stock"}
                </p>
                <p className="text-muted">
                  Seller:{" "}
                  {part.seller_slug ? (
                    <Link
                      to={`/sellers/${part.seller_slug}`}
                      className="font-semibold text-link hover:underline"
                    >
                      {part.seller_name || "Unknown seller"}
                    </Link>
                  ) : (
                    part.seller_name || "Unknown seller"
                  )}
                </p>
              </div>
            </div>

            <div className={["mt-6 rounded-2xl border px-4 py-4", toneClasses(fitment.tone)].join(" ")}>
              <p className="font-semibold">{fitment.title}</p>
              <p className="mt-1 text-sm">{fitment.description}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-surface/70 px-3 py-1 text-xs font-semibold text-current">
                  {compatibility.length} compatibility row{compatibility.length === 1 ? "" : "s"}
                </span>

                {selectedVehicleMatch ? (
                  <span className="rounded-full bg-surface/70 px-3 py-1 text-xs font-semibold text-current">
                    Exact match confirmed
                  </span>
                ) : null}

                {selectedVehicle ? (
                  <button
                    type="button"
                    onClick={() => saveVehicle(selectedVehicle)}
                    className="rounded-full bg-surface/70 px-3 py-1 text-xs font-semibold text-current transition hover:bg-surface-3"
                  >
                    Save vehicle
                  </button>
                ) : null}
              </div>

              <p className="mt-3 text-xs opacity-80">
                Final purchase confidence should still confirm SKU, OEM reference, and seller guidance.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="inline-flex h-12 items-center rounded-2xl border border-line bg-surface">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    className="h-full px-4 text-lg text-ink-2"
                  >
                    −
                  </button>
                  <span className="min-w-[44px] text-center text-sm font-semibold text-ink">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    className="h-full px-4 text-lg text-ink-2"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!inStock || adding}
                  className="btn-cta h-12 flex-1 rounded-2xl px-6 text-sm"
                >
                  {adding ? "Adding..." : added ? "Added to cart" : "Add to cart"}
                </button>

                <Link
                  to="/cart"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-line bg-surface px-6 text-sm font-semibold text-ink-2 transition hover:bg-surface-3"
                >
                  Cart ({totalItems})
                </Link>
              </div>

              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-400/20"
              >
                Ask seller on WhatsApp
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-bold text-ink">Why buyers trust this listing</h2>
            <div className="mt-4 space-y-3 text-sm text-muted">
              <p>• SKU and structured compatibility improve confidence before purchase.</p>
              <p>• Stock visibility helps reduce surprise checkout failures.</p>
              <p>• Seller contact via WhatsApp makes pre-purchase confirmation easier.</p>
              <p>• Vehicle-aware matching helps rank the most relevant parts higher.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-bold text-ink">Seller trust</h2>
            <div className="mt-4 space-y-3 text-sm text-muted">
              <p>
                <span className="font-semibold text-ink">Seller:</span>{" "}
                {part.seller_slug ? (
                  <Link
                    to={`/sellers/${part.seller_slug}`}
                    className="font-semibold text-link hover:underline"
                  >
                    {part.seller_name || "Unknown"}
                  </Link>
                ) : (
                  part.seller_name || "Unknown"
                )}
              </p>
              <p>
                <span className="font-semibold text-ink">Location:</span>{" "}
                {part.seller_location || "Not specified"}
              </p>
              <p>
                <span className="font-semibold text-ink">Listing status:</span>{" "}
                {part.status}
              </p>
              <p>
                <span className="font-semibold text-ink">Availability:</span>{" "}
                {inStock ? `${stock} unit(s) available` : "Currently unavailable"}
              </p>
              {part.sku ? (
                <p>
                  <span className="font-semibold text-ink">SKU:</span> {part.sku}
                </p>
              ) : null}
            </div>

            <p className="mt-4 text-xs text-muted">
              Strong parts usually include stock, SKU, compatibility, and easy seller confirmation paths.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-ink">Quick fitment summary</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-surface-2 p-4">
                <p className="text-xs uppercase tracking-wide text-faint">Selected vehicle</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {selectedVehicle ? getVehicleLabel(selectedVehicle) : "Not selected"}
                </p>
              </div>

              <div className="rounded-2xl bg-surface-2 p-4">
                <p className="text-xs uppercase tracking-wide text-faint">Compatibility rows</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {compatibility.length}
                </p>
              </div>

              <div className="rounded-2xl bg-surface-2 p-4">
                <p className="text-xs uppercase tracking-wide text-faint">Match status</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {selectedVehicleMatch ? "Confirmed match" : "Not confirmed"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-ink">Compatibility</h2>
            <p className="mt-1 text-sm text-muted">
              Review all known vehicle matches for this part.
            </p>

            {compatibility.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-line-strong bg-surface-2 p-5 text-sm text-muted">
                No compatibility rows are available yet for this part.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {compatibility.map((row) => {
                  const rowMatch = doesVehicleMatch(row, selectedVehicle);

                  return (
                    <div
                      key={row.id}
                      className={[
                        "rounded-2xl border p-4",
                        rowMatch
                          ? "border-emerald-400/30 bg-emerald-400/10"
                          : "border-line bg-surface-2",
                      ].join(" ")}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">
                          {row.make} • {row.model}
                        </p>
                        {rowMatch ? (
                          <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Your selected vehicle matches
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-sm text-muted">
                        {row.year_start}
                        {row.year_end ? ` → ${row.year_end}` : ""}
                        {row.engine ? ` • ${row.engine}` : ""}
                        {row.trim ? ` • ${row.trim}` : ""}
                      </p>

                      {row.notes ? (
                        <p className="mt-2 text-sm text-muted">{row.notes}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-ink">Specifications</h2>

            {specs.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-line-strong bg-surface-2 p-5 text-sm text-muted">
                No technical specifications available yet.
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {specs.map((spec, index) => (
                  <div
                    key={`${spec.label}-${index}`}
                    className="rounded-2xl bg-surface-2 p-4"
                  >
                    <p className="text-xs uppercase tracking-wide text-faint">
                      {spec.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {spec.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-ink">Purchase reassurance</h2>
            <div className="mt-4 space-y-3 text-sm text-muted">
              <p>• Confirm exact fitment when your vehicle has engine or trim variations.</p>
              <p>• Use seller contact before checkout if you need additional confidence.</p>
              <p>• SKU and compatibility rows are stronger trust signals than title alone.</p>
              <p>• In-stock parts with structured fitment usually move faster and convert better.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-ink">Need another option?</h2>
            <p className="mt-1 text-sm text-muted">
              Explore related parts from the marketplace inventory.
            </p>

            {safeRelatedParts.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-line-strong bg-surface-2 p-5 text-sm text-muted">
                No related parts available yet.
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {safeRelatedParts.map((item) => (
                  <Link
                    key={item.id}
                    to={`/parts/${item.slug}`}
                    className="overflow-hidden rounded-2xl border border-line bg-surface transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="bg-surface-2">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="h-36 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-36 items-center justify-center text-sm text-faint">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <p className="line-clamp-2 font-semibold text-ink">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {item.brand_name || "Brand"} • {item.category_name || "Category"}
                      </p>
                      <p className="mt-3 text-lg font-bold text-ink">
                        {formatPrice(item.price)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-surface/95 px-4 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{part.title}</p>
            <div className="flex items-center gap-2">
              <p className="text-base font-bold text-ink">{formatPrice(part.price)}</p>
              {selectedVehicleMatch ? (
                <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  Match
                </span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!inStock || adding}
            className="btn-cta h-11 rounded-2xl px-5 text-sm"
          >
            {adding ? "Adding..." : added ? "Added" : "Add to cart"}
          </button>
        </div>
      </div>
    </section>
  );
}
