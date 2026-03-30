import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiGet } from "../lib/api";
import { formatPriceGBP } from "../lib/formatters";

const API_BASE = "https://parthub-api.ori00fit-c96.workers.dev";

export default function PartDetailsPage() {
  const { slug } = useParams();

  const [part, setPart] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [related, setRelated] = useState([]);
  const [activeImage, setActiveImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const catalogRes = await apiGet(`/api/v1/catalog/parts/${slug}`);
        const basicPart = catalogRes?.data;

        if (!basicPart) {
          throw new Error("Part not found");
        }

        const marketplaceRes = await fetch(
          `${API_BASE}/api/v1/marketplace/parts/${basicPart.id}`
        );
        const marketplaceData = await marketplaceRes.json();

        if (!marketplaceRes.ok || !marketplaceData?.ok) {
          throw new Error(
            marketplaceData?.error?.message || "Failed to load part gallery"
          );
        }

        const relatedRes = await apiGet("/api/v1/catalog/parts");
        const relatedItems = (relatedRes?.data || []).filter(
          (item) => item.slug !== basicPart.slug
        );

        if (!active) return;

        const fullPart = marketplaceData.data;
        const galleryItems = fullPart?.gallery || [];

        setPart(fullPart);
        setGallery(galleryItems);
        setRelated(relatedItems.slice(0, 4));

        const featured =
          galleryItems.find((item) => item.is_featured)?.url ||
          fullPart.image_url ||
          "";

        setActiveImage(featured);
      } catch (err) {
        if (!active) return;
        setError(err.message || "Failed to load part");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [slug]);

  const normalizedGallery = useMemo(() => {
    if (!gallery.length && part?.image_url) {
      return [
        {
          id: "fallback-image",
          url: part.image_url,
          alt_text: part.title,
          is_featured: 1,
        },
      ];
    }
    return gallery;
  }, [gallery, part]);

  const activeImageIndex = useMemo(() => {
    const index = normalizedGallery.findIndex((item) => item.url === activeImage);
    return index >= 0 ? index + 1 : normalizedGallery.length ? 1 : 0;
  }, [normalizedGallery, activeImage]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        Loading part...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
        {error}
      </div>
    );
  }

  if (!part) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        Part not found.
      </div>
    );
  }

  return (
    <section className="space-y-8 pb-24">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <Link to="/" className="hover:text-blue-600">Home</Link>
        <span>›</span>
        <Link to="/parts" className="hover:text-blue-600">Parts</Link>
        <span>›</span>
        <span className="text-gray-700">{part.title}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-gray-100">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={part.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-center text-sm text-gray-400">
                  No image available
                </div>
              )}

              {normalizedGallery.length > 0 ? (
                <div className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
                  {activeImageIndex}/{normalizedGallery.length}
                </div>
              ) : null}
            </div>
          </div>

          {normalizedGallery.length > 0 ? (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
              {normalizedGallery.map((img) => {
                const isActive = img.url === activeImage;

                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImage(img.url)}
                    className={[
                      "overflow-hidden rounded-2xl border bg-white shadow-sm transition",
                      isActive
                        ? "border-blue-600 ring-2 ring-blue-100"
                        : "border-gray-200 hover:border-blue-300",
                    ].join(" ")}
                  >
                    <div className="aspect-square bg-gray-100">
                      <img
                        src={img.url}
                        alt={img.alt_text || part.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Product highlights</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Condition</p>
                <p className="mt-1 font-semibold text-gray-900">{part.condition}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Availability</p>
                <p className="mt-1 font-semibold text-gray-900">{part.quantity} in stock</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Category</p>
                <p className="mt-1 font-semibold text-gray-900">{part.category_name}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Brand</p>
                <p className="mt-1 font-semibold text-gray-900">{part.brand_name}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  UK marketplace listing
                </div>
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                  {part.title}
                </h1>
                <p className="mt-2 text-sm text-gray-500">
                  {part.brand_name} • {part.category_name}
                </p>
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {part.condition}
              </span>
            </div>

            <p className="mb-5 text-sm leading-6 text-gray-600">
              {part.description || "No description available."}
            </p>

            <div className="mb-5">
              <p className="text-3xl font-bold text-gray-900">
                {formatPriceGBP(part.price)}
              </p>
              {part.compare_price ? (
                <p className="mt-1 text-sm text-gray-400 line-through">
                  {formatPriceGBP(part.compare_price)}
                </p>
              ) : null}
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-gray-50 p-3">
                <p className="text-gray-400">Stock</p>
                <p className="font-semibold text-gray-900">{part.quantity}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-3">
                <p className="text-gray-400">SKU</p>
                <p className="font-semibold text-gray-900">{part.sku || "-"}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-3">
                <p className="text-gray-400">Status</p>
                <p className="font-semibold text-gray-900">{part.status}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-3">
                <p className="text-gray-400">Weight</p>
                <p className="font-semibold text-gray-900">
                  {part.weight_kg ? `${part.weight_kg} kg` : "-"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
                Add to cart
              </button>
              <button className="inline-flex items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50">
                Contact seller
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-gray-500">
              <div className="rounded-2xl border border-gray-200 p-3">
                ✔ Secure checkout
              </div>
              <div className="rounded-2xl border border-gray-200 p-3">
                ✔ UK pricing in GBP
              </div>
              <div className="rounded-2xl border border-gray-200 p-3">
                ✔ Seller-managed inventory
              </div>
              <div className="rounded-2xl border border-gray-200 p-3">
                ✔ Fast mobile experience
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Seller information</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Store</p>
                <p className="mt-1 font-semibold text-gray-900">{part.seller_name}</p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Location</p>
                <p className="mt-1 font-semibold text-gray-900">{part.seller_location}</p>
              </div>

              <Link
                to={`/parts?seller=${part.seller_slug || ""}`}
                className="inline-flex items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                View seller inventory
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Why buy on PartHub?</h2>
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              <p>✔ Multiple product images powered by R2</p>
              <p>✔ Live D1-backed inventory</p>
              <p>✔ Seller-managed listings and gallery flow</p>
              <p>✔ Ready for marketplace scale</p>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Related parts</h2>
            <p className="text-sm text-gray-500">
              More products you may want to compare.
            </p>
          </div>
          <Link to="/parts" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            View all →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="aspect-[4/3] bg-gray-100">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
                    No image
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3 className="line-clamp-2 font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {item.brand_name} • {item.category_name}
                </p>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <p className="text-lg font-bold text-gray-900">
                    {formatPriceGBP(item.price)}
                  </p>

                  <Link
                    to={`/parts/${item.slug}`}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    View
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500">{part.title}</p>
            <p className="text-lg font-bold text-gray-900">
              {formatPriceGBP(part.price)}
            </p>
          </div>

          <button className="inline-flex min-w-[140px] items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">
            Add to cart
          </button>
        </div>
      </div>
    </section>
  );
}
