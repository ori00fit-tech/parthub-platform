import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiGet } from "../lib/api";
import { formatPriceGBP } from "../lib/formatters";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";

export default function HomePage() {
  const navigate = useNavigate();
  const { selectedVehicle } = useSelectedVehicle();

  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      apiGet("/api/v1/catalog/parts"),
      apiGet("/api/v1/catalog/categories"),
    ])
      .then(([partsRes, categoriesRes]) => {
        if (!active) return;
        setParts(partsRes?.data || []);
        setCategories(categoriesRes?.data || []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const featuredParts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const filtered = normalized
      ? parts.filter((part) =>
          [
            part.title,
            part.description,
            part.brand_name,
            part.category_name,
            part.sku,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(normalized)
        )
      : parts;

    return filtered.slice(0, 6);
  }, [parts, query]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    const normalized = query.trim();
    navigate(normalized ? `/parts?search=${encodeURIComponent(normalized)}` : "/parts");
  }

  const vehicleLabel = selectedVehicle?.label || "";
  const heroTitle = vehicleLabel
    ? `Find parts for ${vehicleLabel}`
    : "Find the right auto part for your vehicle.";

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 text-white shadow-xl">
        <div className="space-y-6 px-5 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-blue-100">
              UK-focused marketplace • Cloudflare powered
            </div>

            {selectedVehicle ? (
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                Vehicle: {selectedVehicle.label}
              </div>
            ) : null}
          </div>

          <div className="max-w-2xl space-y-3">
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
              {heroTitle}
            </h1>
            <p className="max-w-xl text-sm text-blue-100 sm:text-base">
              Search fast, compare prices in GBP, and buy from trusted UK sellers.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="rounded-2xl bg-white p-3 shadow-lg">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search brake pads, oil filter, Bosch, FLT-2002..."
                className="h-12 flex-1 rounded-xl border border-gray-200 px-4 text-sm text-gray-900 outline-none ring-0 placeholder:text-gray-400 focus:border-blue-500"
              />
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Search parts
              </button>
            </div>
          </form>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/vehicle-selector"
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              {selectedVehicle ? "Change selected vehicle" : "Select your vehicle"}
            </Link>

            <Link
              to="/parts"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
            >
              Browse all parts
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
              ✔ UK sellers
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
              ✔ Fast delivery
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
              ✔ Verified parts
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
              ✔ Secure checkout
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Link
          to="/vehicle-selector"
          className="rounded-2xl bg-slate-950 px-5 py-4 text-white shadow-sm transition hover:bg-black"
        >
          <p className="text-sm text-white/70">Vehicle-first</p>
          <p className="mt-1 text-lg font-semibold">
            {selectedVehicle ? "Update vehicle context" : "Choose your vehicle"}
          </p>
        </Link>

        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-sm text-gray-500">Live inventory</p>
          <p className="mt-1 text-lg font-semibold">{parts.length}+ visible parts</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-sm text-gray-500">Coverage</p>
          <p className="mt-1 text-lg font-semibold">{categories.length}+ categories</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Popular categories</h2>
            <p className="text-sm text-gray-500">Explore fast-moving product groups.</p>
          </div>
          <Link to="/parts" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            View all parts →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.slice(0, 8).map((category) => (
            <Link
              key={category.id}
              to={`/parts?category=${category.slug}`}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <p className="text-sm font-semibold text-gray-900">{category.name}</p>
              <p className="mt-1 text-xs text-gray-500">Browse category</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">
            {selectedVehicle ? "Suggested parts for your selected vehicle" : "Available parts"}
          </h2>
          <p className="text-sm text-gray-500">Fresh results from your live D1 inventory.</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            Loading parts...
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredParts.map((part) => (
            <article
              key={part.id}
              className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{part.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {part.brand_name} • {part.category_name}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {part.condition}
                </span>
              </div>

              <p className="mb-4 text-sm text-gray-600">
                {part.description || "No description available."}
              </p>

              <div className="mb-4 space-y-1 text-sm text-gray-500">
                <p>Seller: {part.seller_name}</p>
                <p>Location: {part.seller_location}</p>
                <p>Stock: {part.quantity}</p>
              </div>

              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPriceGBP(part.price)}
                  </p>
                  {part.compare_price ? (
                    <p className="text-sm text-gray-400 line-through">
                      {formatPriceGBP(part.compare_price)}
                    </p>
                  ) : null}
                </div>

                <Link
                  to={`/parts/${part.slug}`}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  View part
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <h2 className="text-2xl font-bold">Can’t find your exact part?</h2>
            <p className="mt-2 text-sm text-gray-600">
              Submit a request and let sellers respond with matching offers.
            </p>
          </div>

          <button className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-black">
            Request a part
          </button>
        </div>
      </section>
    </div>
  );
}
