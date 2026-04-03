import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiGet } from "../lib/api";
import { formatPriceGBP } from "../lib/formatters";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";

function sortOptions() {
  return [
    { value: "relevance", label: "Sort: relevance" },
    { value: "newest", label: "Sort: newest" },
    { value: "price_asc", label: "Price: low to high" },
    { value: "price_desc", label: "Price: high to low" },
  ];
}

export default function PartsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { vehicle, hasVehicle, clearVehicle } = useSelectedVehicle();

  const [parts, setParts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get("brand") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [selectedCondition, setSelectedCondition] = useState(searchParams.get("condition") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "relevance");
  const [minPrice, setMinPrice] = useState(searchParams.get("min_price") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") || "");
  const [applyVehicleFilter, setApplyVehicleFilter] = useState(hasVehicle);

  useEffect(() => {
    let active = true;

    async function loadFilters() {
      try {
        const [brandsRes, categoriesRes] = await Promise.all([
          apiGet("/api/v1/catalog/brands"),
          apiGet("/api/v1/catalog/categories"),
        ]);

        if (!active) return;
        setBrands(Array.isArray(brandsRes?.data) ? brandsRes.data : []);
        setCategories(Array.isArray(categoriesRes?.data) ? categoriesRes.data : []);
      } catch {}
    }

    loadFilters();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function runSearch() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();

        if (search.trim()) params.set("q", search.trim());
        if (selectedBrand) params.set("brand", selectedBrand);
        if (selectedCategory) params.set("category", selectedCategory);
        if (selectedCondition) params.set("condition", selectedCondition);
        if (sortBy && sortBy !== "relevance") params.set("sort", sortBy);
        if (minPrice) params.set("min_price", minPrice);
        if (maxPrice) params.set("max_price", maxPrice);

        if (applyVehicleFilter && hasVehicle) {
          params.set("make", vehicle.make);
          params.set("model", vehicle.model);
          params.set("year", vehicle.year);
        }

        const queryString = params.toString();
        const res = await apiGet(`/api/v1/search${queryString ? `?${queryString}` : ""}`);

        if (!active) return;

        setParts(Array.isArray(res?.data) ? res.data : []);
        setMeta(res?.meta || null);
      } catch (err) {
        if (!active) return;
        setParts([]);
        setMeta(null);
        setError(err?.message || "Failed to search parts");
      } finally {
        if (active) setLoading(false);
      }
    }

    runSearch();

    return () => {
      active = false;
    };
  }, [
    search,
    selectedBrand,
    selectedCategory,
    selectedCondition,
    sortBy,
    minPrice,
    maxPrice,
    applyVehicleFilter,
    hasVehicle,
    vehicle,
  ]);

  useEffect(() => {
    const next = new URLSearchParams();

    if (search.trim()) next.set("q", search.trim());
    if (selectedBrand) next.set("brand", selectedBrand);
    if (selectedCategory) next.set("category", selectedCategory);
    if (selectedCondition) next.set("condition", selectedCondition);
    if (sortBy && sortBy !== "relevance") next.set("sort", sortBy);
    if (minPrice) next.set("min_price", minPrice);
    if (maxPrice) next.set("max_price", maxPrice);

    if (applyVehicleFilter && hasVehicle) {
      next.set("make", vehicle.make);
      next.set("model", vehicle.model);
      next.set("year", vehicle.year);
    }

    setSearchParams(next, { replace: true });
  }, [
    search,
    selectedBrand,
    selectedCategory,
    selectedCondition,
    sortBy,
    minPrice,
    maxPrice,
    applyVehicleFilter,
    hasVehicle,
    vehicle,
    setSearchParams,
  ]);

  const summaryText = useMemo(() => {
    const total = meta?.pagination?.total ?? parts.length;
    if (applyVehicleFilter && hasVehicle) {
      return `${total} parts found for ${vehicle.makeName} ${vehicle.modelName} ${vehicle.year}`;
    }
    return `${total} parts found`;
  }, [meta, parts.length, applyVehicleFilter, hasVehicle, vehicle]);

  function clearFilters() {
    setSearch("");
    setSelectedBrand("");
    setSelectedCategory("");
    setSelectedCondition("");
    setSortBy("relevance");
    setMinPrice("");
    setMaxPrice("");
  }

  return (
    <section className="space-y-6 pb-10">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-5 text-white shadow-lg sm:p-7">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
            Vehicle-aware search engine
          </div>

          <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
            Find the right part faster
          </h1>

          <p className="mt-3 text-sm text-blue-100 sm:text-base">
            Search by part name, SKU, brand, condition, and vehicle compatibility.
          </p>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1.4fr_0.9fr_0.8fr]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search turbo, brake pad, engine, FLT-2002..."
            className="h-14 rounded-2xl border border-white/10 bg-white px-4 text-sm text-gray-900 outline-none placeholder:text-gray-400"
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

          <Link
            to="/vehicle-selector"
            className="inline-flex h-14 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Choose vehicle
          </Link>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Vehicle context</h2>
            <p className="text-sm text-gray-500">
              Search becomes more accurate when a vehicle is selected.
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
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
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
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="h-12 rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
          >
            <option value="">All conditions</option>
            <option value="new">New</option>
            <option value="used">Used</option>
            <option value="refurbished">Refurbished</option>
          </select>

          <input
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min price"
            className="h-12 rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
          />

          <input
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max price"
            className="h-12 rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-12 rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
          >
            {sortOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{summaryText}</span>
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

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          Loading search results...
        </div>
      ) : parts.length === 0 ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h3 className="text-xl font-bold text-gray-900">No parts found</h3>
          <p className="mt-2 text-sm text-gray-500">
            Try another keyword, broader filters, or disable vehicle filtering.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Reset search filters
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
          {parts.map((part) => (
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

                  <div className="mb-4 flex flex-wrap gap-2">
                    {Number(part.compatibility_count || 0) > 0 ? (
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        Compatible with {part.compatibility_count} vehicle setups
                      </span>
                    ) : null}

                    {applyVehicleFilter && hasVehicle ? (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        Vehicle-matched
                      </span>
                    ) : null}
                  </div>

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
    </section>
  );
}
