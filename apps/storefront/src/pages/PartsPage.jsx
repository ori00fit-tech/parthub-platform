import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiGet } from "../lib/api";
import { formatPriceGBP } from "../lib/formatters";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";

function sortParts(items, sortValue) {
  const list = [...items];

  switch (sortValue) {
    case "price_asc":
      return list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    case "price_desc":
      return list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    case "stock_desc":
      return list.sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0));
    case "name_asc":
      return list.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    case "newest":
    default:
      return list.sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
  }
}

export default function PartsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { vehicle, hasVehicle, clearVehicle } = useSelectedVehicle();

  const [parts, setParts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get("brand") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");
  const [stockOnly, setStockOnly] = useState(searchParams.get("stock") === "1");
  const [applyVehicleFilter, setApplyVehicleFilter] = useState(hasVehicle);

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      try {
        setLoading(true);
        setError("");

        const catalogPath = applyVehicleFilter && hasVehicle
          ? `/api/v1/catalog/parts?make=${encodeURIComponent(vehicle.makeName)}&model=${encodeURIComponent(vehicle.modelName)}&year=${encodeURIComponent(vehicle.year)}`
          : "/api/v1/catalog/parts";

        const [partsRes, brandsRes, categoriesRes] = await Promise.all([
          apiGet(catalogPath),
          apiGet("/api/v1/catalog/brands"),
          apiGet("/api/v1/catalog/categories"),
        ]);

        if (!active) return;

        setParts(partsRes?.data || []);
        setBrands(brandsRes?.data || []);
        setCategories(categoriesRes?.data || []);
      } catch (err) {
        if (!active) return;
        setError(err.message || "Failed to load catalog");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCatalog();

    return () => {
      active = false;
    };
  }, [applyVehicleFilter, hasVehicle, vehicle]);

  useEffect(() => {
    const next = new URLSearchParams();

    if (search) next.set("search", search);
    if (selectedBrand) next.set("brand", selectedBrand);
    if (selectedCategory) next.set("category", selectedCategory);
    if (sortBy && sortBy !== "newest") next.set("sort", sortBy);
    if (stockOnly) next.set("stock", "1");

    setSearchParams(next, { replace: true });
  }, [search, selectedBrand, selectedCategory, sortBy, stockOnly, setSearchParams]);

  const filteredParts = useMemo(() => {
    const query = search.trim().toLowerCase();

    let list = parts.filter((item) => {
      const matchesSearch =
        !query ||
        String(item.title || "").toLowerCase().includes(query) ||
        String(item.sku || "").toLowerCase().includes(query) ||
        String(item.brand_name || "").toLowerCase().includes(query) ||
        String(item.category_name || "").toLowerCase().includes(query);

      const matchesBrand = !selectedBrand || item.brand_slug === selectedBrand;
      const matchesCategory = !selectedCategory || item.category_slug === selectedCategory;
      const matchesStock = !stockOnly || Number(item.quantity || 0) > 0;

      return matchesSearch && matchesBrand && matchesCategory && matchesStock;
    });

    return sortParts(list, sortBy);
  }, [parts, search, selectedBrand, selectedCategory, stockOnly, sortBy]);

  function clearFilters() {
    setSearch("");
    setSelectedBrand("");
    setSelectedCategory("");
    setSortBy("newest");
    setStockOnly(false);
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        Loading catalog...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
        {error}
      </div>
    );
  }

  return (
    <section className="space-y-6 pb-10">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-5 text-white shadow-lg sm:p-7">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
            UK marketplace • Live parts catalog
          </div>

          <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
            Find the right part faster
          </h1>

          <p className="mt-3 text-sm text-blue-100 sm:text-base">
            Search by part name, SKU, brand, or browse every category and brand in one place.
          </p>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1.4fr_0.9fr_0.8fr]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brake pads, oil filter, Bosch, FLT-2002..."
            className="h-14 rounded-2xl border border-white/10 bg-white px-4 text-sm text-gray-900 outline-none ring-0 placeholder:text-gray-400"
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-14 rounded-2xl border border-white/10 bg-white px-4 text-sm text-gray-900 outline-none"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="h-14 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Search parts
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm backdrop-blur">
            ✔ UK sellers
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm backdrop-blur">
            ✔ Fast delivery
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm backdrop-blur">
            ✔ Verified parts
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm backdrop-blur">
            ✔ Secure checkout
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Fitment filter</h2>
            <p className="text-sm text-gray-500">
              Use your selected vehicle to narrow the catalog.
            </p>
          </div>

          {hasVehicle ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                {vehicle.makeName} • {vehicle.modelName} • {vehicle.year}
              </div>

              <button
                type="button"
                onClick={() => setApplyVehicleFilter((prev) => !prev)}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-semibold transition",
                  applyVehicleFilter
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50",
                ].join(" ")}
              >
                {applyVehicleFilter ? "Vehicle filter ON" : "Vehicle filter OFF"}
              </button>

              <button
                type="button"
                onClick={clearVehicle}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                Clear vehicle
              </button>

              <Link
                to="/vehicle-selector"
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                Change vehicle
              </Link>
            </div>
          ) : (
            <Link
              to="/vehicle-selector"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Choose vehicle
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="h-12 rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
          >
            <option value="">All brands</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.slug}>
                {brand.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-12 rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-12 rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
          >
            <option value="newest">Sort: newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="stock_desc">Stock: highest first</option>
            <option value="name_asc">Name: A to Z</option>
          </select>

          <label className="flex h-12 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={stockOnly}
              onChange={(e) => setStockOnly(e.target.checked)}
              className="h-4 w-4"
            />
            In stock
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{filteredParts.length}</span> parts found
            {applyVehicleFilter && hasVehicle ? (
              <span className="ml-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                filtered by vehicle
              </span>
            ) : null}
          </p>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredParts.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h3 className="text-xl font-bold text-gray-900">No parts found</h3>
            <p className="mt-2 text-sm text-gray-500">
              Try another filter, category, or disable vehicle filtering.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
              >
                Reset catalog filters
              </button>

              {applyVehicleFilter && hasVehicle ? (
                <button
                  type="button"
                  onClick={() => setApplyVehicleFilter(false)}
                  className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800"
                >
                  Disable vehicle filter
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredParts.map((part) => (
              <article
                key={part.id}
                className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="grid h-full grid-cols-1 sm:grid-cols-[180px_1fr]">
                  <div className="bg-gray-100">
                    {part.image_url ? (
                      <img
                        src={part.image_url}
                        alt={part.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full min-h-[180px] items-center justify-center text-sm text-gray-400">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{part.title}</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {part.brand_name} • {part.category_name}
                        </p>
                      </div>

                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        {part.condition}
                      </span>
                    </div>

                    <p className="mb-4 text-sm leading-6 text-gray-600">
                      {part.description || "No description available."}
                    </p>

                    <div className="mb-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
                      <p>Seller: {part.seller_name}</p>
                      <p>Location: {part.seller_location}</p>
                      <p>SKU: {part.sku || "-"}</p>
                      <p>Stock: {part.quantity}</p>
                    </div>

                    <div className="mt-auto flex items-end justify-between gap-4">
                      <div>
                        <p className="text-3xl font-bold text-gray-900">
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
                        className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        View part
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
