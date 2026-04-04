import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiGet } from "../lib/api";
import { formatPriceGBP } from "../lib/formatters";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";
import GaragePanel from "../features/vehicles/GaragePanel";
import VehicleContextBar from "../features/vehicles/VehicleContextBar";
import SavedSearchesPanel, { saveSearchItem } from "../features/search/SavedSearchesPanel";

function normalizeList(payload, fallbackKey) {
  const list =
    payload?.data?.[fallbackKey] ||
    payload?.data ||
    payload?.[fallbackKey] ||
    [];

  return Array.isArray(list) ? list : [];
}

function normalizeVehicleContext(ctx) {
  const selectedVehicle = ctx?.selectedVehicle || ctx?.vehicle || null;

  return {
    selectedVehicle,
    clearVehicle: ctx?.clearVehicle || (() => {}),
    hasVehicle: Boolean(selectedVehicle),
  };
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

function normalizeMeta(meta) {
  const pagination = meta?.pagination || {};

  return {
    page: Number(pagination.page || 1),
    limit: Number(pagination.limit || 20),
    total: Number(pagination.total || 0),
    totalPages: Number(pagination.total_pages || 1),
  };
}

function buildSearchParamsFromState(filters) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.condition) params.set("condition", filters.condition);
  if (filters.min_price) params.set("min_price", filters.min_price);
  if (filters.max_price) params.set("max_price", filters.max_price);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page && String(filters.page) !== "1") params.set("page", String(filters.page));

  return params;
}

function buildApiQuery(filters, vehicle) {
  const params = buildSearchParamsFromState(filters);

  if (vehicle?.make || vehicle?.make_name || vehicle?.makeName) {
    params.set(
      "make",
      String(vehicle.make || vehicle.make_name || vehicle.makeName || "").toLowerCase()
    );
  }

  if (vehicle?.model || vehicle?.model_name || vehicle?.modelName) {
    params.set(
      "model",
      String(vehicle.model || vehicle.model_name || vehicle.modelName || "").toLowerCase()
    );
  }

  if (vehicle?.year) {
    params.set("year", String(vehicle.year));
  }

  return params.toString();
}



function buildEmptyStateHints({ q, hasVehicle, selectedVehicle, filters }) {
  const hints = [];

  if (q) {
    hints.push(`Try a broader keyword than "${q}".`);
  } else {
    hints.push("Try searching by part name, SKU, or brand.");
  }

  if (hasVehicle && selectedVehicle?.label) {
    hints.push(`Your current vehicle filter is ${selectedVehicle.label}.`);
    hints.push("Clear the vehicle context to see a wider catalog.");
  }

  if (filters?.category) {
    hints.push("Try removing the category filter.");
  }

  if (filters?.brand) {
    hints.push("Try removing the brand filter.");
  }

  if (filters?.condition) {
    hints.push("Try switching condition or removing it.");
  }

  return [...new Set(hints)].slice(0, 4);
}

function getRankingBadges(part, hasVehicle) {
  const badges = [];

  if (Number(part?.exact_vehicle_match || 0) === 1) {
    badges.push({
      label: "Exact fit",
      className: "bg-green-50 text-green-700",
    });
  } else if (Number(part?.partial_vehicle_match || 0) === 1 && hasVehicle) {
    badges.push({
      label: "Vehicle match",
      className: "bg-emerald-50 text-emerald-700",
    });
  }

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

  if (Number(part?.quantity || 0) > 0 && Number(part?.quantity || 0) <= 2) {
    badges.push({
      label: "Low stock",
      className: "bg-red-50 text-red-700",
    });
  }

  return badges.slice(0, 3);
}


function getSellerBadges(part) {
  const badges = [];

  if (Number(part?.compatibility_count || 0) > 0) {
    badges.push({
      label: "Fitment-ready seller",
      className: "bg-indigo-50 text-indigo-700",
    });
  }

  if (Number(part?.quantity || 0) >= 5) {
    badges.push({
      label: "Well stocked",
      className: "bg-emerald-50 text-emerald-700",
    });
  }

  if (Number(part?.featured || 0) === 1) {
    badges.push({
      label: "Trusted seller",
      className: "bg-amber-50 text-amber-700",
    });
  }

  return badges.slice(0, 2);
}

function vehicleMatchesCard(part, vehicle) {
  if (!vehicle) return false;
  return Number(part?.exact_vehicle_match || 0) === 1;
}

export default function PartsPage() {
  const vehicleCtx = normalizeVehicleContext(useSelectedVehicle());
  const { selectedVehicle, hasVehicle, clearVehicle } = vehicleCtx;

  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState({
    q: searchParams.get("q") || "",
    category: searchParams.get("category") || "",
    brand: searchParams.get("brand") || "",
    condition: searchParams.get("condition") || "",
    min_price: searchParams.get("min_price") || "",
    max_price: searchParams.get("max_price") || "",
    sort: searchParams.get("sort") || "relevance",
    page: Number(searchParams.get("page") || 1),
  });

  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [shortlist, setShortlist] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("parthub_compare_items");
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setShortlist(parsed.slice(-4));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadMeta() {
      try {
        setLoadingMeta(true);

        const [categoriesRes, brandsRes] = await Promise.all([
          apiGet("/api/v1/catalog/categories"),
          apiGet("/api/v1/catalog/brands"),
        ]);

        if (!active) return;

        setCategories(normalizeList(categoriesRes, "categories"));
        setBrands(normalizeList(brandsRes, "brands"));
      } catch (_) {
      } finally {
        if (active) setLoadingMeta(false);
      }
    }

    loadMeta();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadParts() {
      try {
        setLoading(true);
        setError("");

        const query = buildApiQuery(filters, selectedVehicle);
        const response = await apiGet(`/api/v1/search?${query}`);

        if (!active) return;

        const nextParts = normalizeList(response, "parts");
        setParts(nextParts);
        setMeta(normalizeMeta(response?.meta));
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load parts");
      } finally {
        if (active) setLoading(false);
      }
    }

    const nextParams = buildSearchParamsFromState(filters);
    setSearchParams(nextParams, { replace: true });
    loadParts();

    return () => {
      active = false;
    };
  }, [filters, selectedVehicle, setSearchParams]);

  const vehicleLabel = useMemo(() => getVehicleLabel(selectedVehicle), [selectedVehicle]);

  const emptyStateHints = useMemo(
    () =>
      buildEmptyStateHints({
        q: filters.q,
        hasVehicle,
        selectedVehicle,
        filters: {
          category: filters.category,
          brand: filters.brand,
          condition: filters.condition,
        },
      }),
    [filters.q, filters.category, filters.brand, filters.condition, hasVehicle, selectedVehicle]
  );

  const exactMatchesCount = useMemo(
    () => parts.filter((part) => Number(part?.exact_vehicle_match || 0) === 1).length,
    [parts]
  );

  const partialMatchesCount = useMemo(
    () => parts.filter((part) => Number(part?.partial_vehicle_match || 0) === 1).length,
    [parts]
  );

  const topMatch = useMemo(() => {
    if (!Array.isArray(parts) || parts.length === 0) return null;
    return parts[0];
  }, [parts]);

  const shortlistIds = useMemo(
    () => shortlist.map((item) => item.id),
    [shortlist]
  );

  function toggleShortlist(part) {
    setShortlist((prev) => {
      const exists = prev.some((item) => item.id === part.id);
      let next;

      if (exists) {
        next = prev.filter((item) => item.id !== part.id);
      } else {
        const nextItem = {
          id: part.id,
          slug: part.slug,
          title: part.title,
          price: part.price,
          image_url: part.image_url || null,
          quantity: part.quantity,
          condition: part.condition,
          compatibility_count: part.compatibility_count,
          exact_vehicle_match: part.exact_vehicle_match,
          partial_vehicle_match: part.partial_vehicle_match,
          ranking_score: part.ranking_score,
          brand_name: part.brand_name,
          category_name: part.category_name,
          seller_name: part.seller_name,
        };

        next = [...prev, nextItem].slice(-4);
      }

      try {
        localStorage.setItem("parthub_compare_items", JSON.stringify(next));
      } catch {
        // ignore
      }

      return next;
    });
  }

  function setField(key) {
    return (e) => {
      const value = e.target.value;
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        page: 1,
      }));
    };
  }

  function clearAllFilters() {
    setFilters({
      q: "",
      category: "",
      brand: "",
      condition: "",
      min_price: "",
      max_price: "",
      sort: "relevance",
      page: 1,
    });
  }

  function goToPage(page) {
    setFilters((prev) => ({
      ...prev,
      page,
    }));
  }

  function handleSaveSearch() {
    const query = buildApiQuery(filters, selectedVehicle);

    saveSearchItem({
      query,
      label: filters.q ? `Search: ${filters.q}` : "Filtered marketplace search",
      vehicleLabel: vehicleLabel || "",
      createdAt: new Date().toISOString(),
    });
  }

  function handleLoadSavedSearch(item) {
    try {
      const params = new URLSearchParams(item.query || "");

      setFilters({
        q: params.get("q") || "",
        category: params.get("category") || "",
        brand: params.get("brand") || "",
        condition: params.get("condition") || "",
        min_price: params.get("min_price") || "",
        max_price: params.get("max_price") || "",
        sort: params.get("sort") || "relevance",
        page: Number(params.get("page") || 1),
      });
    } catch {
      // ignore bad saved search
    }
  }

  const resultsLabel = loading
    ? "Loading parts..."
    : `${meta.total} result${meta.total === 1 ? "" : "s"} found`;

  const FilterPanel = (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Search
        </label>
        <input
          value={filters.q}
          onChange={setField("q")}
          placeholder="Search by title, SKU, keyword..."
          className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Category
        </label>
        <select
          value={filters.category}
          onChange={setField("category")}
          className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item.id || item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Brand
        </label>
        <select
          value={filters.brand}
          onChange={setField("brand")}
          className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
        >
          <option value="">All brands</option>
          {brands.map((item) => (
            <option key={item.id || item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Condition
        </label>
        <select
          value={filters.condition}
          onChange={setField("condition")}
          className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
        >
          <option value="">All conditions</option>
          <option value="new">New</option>
          <option value="used">Used</option>
          <option value="refurbished">Refurbished</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Min price
          </label>
          <input
            value={filters.min_price}
            onChange={setField("min_price")}
            inputMode="numeric"
            placeholder="0"
            className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Max price
          </label>
          <input
            value={filters.max_price}
            onChange={setField("max_price")}
            inputMode="numeric"
            placeholder="50000"
            className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Sort
        </label>
        <select
          value={filters.sort}
          onChange={setField("sort")}
          className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
        >
          <option value="relevance">Relevance</option>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to high</option>
          <option value="price_desc">Price: High to low</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={clearAllFilters}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
        >
          Clear filters
        </button>

        {hasVehicle ? (
          <button
            type="button"
            onClick={clearVehicle}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            Clear vehicle
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <section className="space-y-6 pb-16">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              Vehicle-aware parts search
            </div>

            <h1 className="text-3xl font-bold sm:text-5xl">
              Find the right part faster
            </h1>

            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              Search listings by keyword, brand, category, and your selected vehicle context.
            </p>

            {hasVehicle ? (
              <div className="mt-5 inline-flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white">
                <span className="font-semibold">Selected vehicle:</span>
                <span>{vehicleLabel}</span>
                <button
                  type="button"
                  onClick={clearVehicle}
                  className="rounded-xl bg-white/15 px-3 py-1 font-semibold text-white transition hover:bg-white/20"
                >
                  Clear
                </button>
              </div>
            ) : (
              <div className="mt-5 inline-flex rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-blue-100">
                No vehicle selected. Search still works, but ranking is stronger with a vehicle selected.
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50 xl:hidden"
            >
              Filters
            </button>

            <button
              type="button"
              onClick={handleSaveSearch}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
            >
              Save search
            </button>

            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Reset search
            </button>
          </div>
        </div>
      </div>

      <VehicleContextBar />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden space-y-6 xl:block">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-gray-900">Filters</h2>
              <p className="mt-1 text-sm text-gray-500">
                Refine results for faster matching.
              </p>
            </div>

            {loadingMeta ? (
              <div className="text-sm text-gray-500">Loading filters...</div>
            ) : (
              FilterPanel
            )}
          </div>

          <GaragePanel />
          <SavedSearchesPanel onLoadSearch={handleLoadSavedSearch} />
        </aside>

        <div className="space-y-5">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-lg font-bold text-gray-900">{resultsLabel}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {hasVehicle
                    ? `${exactMatchesCount} exact match${exactMatchesCount === 1 ? "" : "es"} for ${vehicleLabel}`
                    : "Showing broader marketplace results"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveSearch}
                  className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  Save this search
                </button>
                {filters.q ? (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    Search: {filters.q}
                  </span>
                ) : null}

                {filters.category ? (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    Category: {filters.category}
                  </span>
                ) : null}

                {filters.brand ? (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    Brand: {filters.brand}
                  </span>
                ) : null}

                {hasVehicle ? (
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                    Vehicle-aware
                  </span>
                ) : null}
              </div>
            </div>

            {hasVehicle ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                    Exact matches
                  </p>
                  <p className="mt-1 text-2xl font-bold text-green-900">{exactMatchesCount}</p>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Broader fitment candidates
                  </p>
                  <p className="mt-1 text-2xl font-bold text-blue-900">{partialMatchesCount}</p>
                </div>
              </div>
            ) : null}
          </div>

          {!hasVehicle ? (
            <div className="rounded-3xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 shadow-sm">
              Select your vehicle to unlock exact fitment ranking and stronger part matching.
            </div>
          ) : null}

          {!loading && !error && topMatch ? (
            <div className="rounded-3xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Top result
                  </div>
                  <h3 className="truncate text-xl font-bold text-gray-900">{topMatch.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {topMatch.brand_name || "Brand unavailable"}
                    {topMatch.category_name ? ` • ${topMatch.category_name}` : ""}
                    {hasVehicle && Number(topMatch?.exact_vehicle_match || 0) === 1
                      ? " • Exact fit for your vehicle"
                      : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {getRankingBadges(topMatch, hasVehicle).map((badge) => (
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
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center rounded-2xl bg-white px-4 py-3 text-lg font-bold text-gray-900 shadow-sm">
                    {formatPriceGBP(topMatch.price)}
                  </div>

                  <Link
                    to={`/parts/${topMatch.slug}`}
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    View best match
                  </Link>

                  <button
                    type="button"
                    onClick={() => toggleShortlist(topMatch)}
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                  >
                    {shortlistIds.includes(topMatch.id) ? "Remove from shortlist" : "Add to shortlist"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="h-44 animate-pulse bg-gray-100" />
                  <div className="space-y-3 p-4">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
                    <div className="h-10 w-full animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : parts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-8 shadow-sm sm:p-10">
              <div className="max-w-2xl">
                <h3 className="text-xl font-bold text-gray-900">
                  {hasVehicle
                    ? "No exact matches found for your selected vehicle"
                    : "No parts found"}
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  {hasVehicle
                    ? "No listings matched your current vehicle and filter combination."
                    : "No listings matched your current search and filter combination."}
                </p>

                <div className="mt-5 space-y-3">
                  {emptyStateHints.map((hint, index) => (
                    <div
                      key={index}
                      className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700"
                    >
                      {hint}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Reset search filters
                  </button>

                  {hasVehicle ? (
                    <button
                      type="button"
                      onClick={clearVehicle}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                    >
                      Clear vehicle filter
                    </button>
                  ) : null}

                  <Link
                    to="/parts"
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                  >
                    Browse all parts
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {parts.map((part) => {
                  const exactMatched = vehicleMatchesCard(part, selectedVehicle);
                  const compatibilityCount = Number(part?.compatibility_count || 0);
                  const rankingBadges = getRankingBadges(part, hasVehicle);

                  return (
                    <Link
                      key={part.id}
                      to={`/parts/${part.slug}`}
                      className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="relative bg-gray-100">
                        {part.image_url ? (
                          <img
                            src={part.image_url}
                            alt={part.title}
                            className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                            No image
                          </div>
                        )}

                        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-gray-800 shadow-sm">
                            {part.condition}
                          </span>

                          {exactMatched ? (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-[11px] font-semibold text-green-700 shadow-sm">
                              Vehicle-matched
                            </span>
                          ) : null}
                        </div>
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

                          {rankingBadges.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {rankingBadges.map((badge) => (
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
                          ) : null}
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
                            <p>{part.quantity > 0 ? `${part.quantity} in stock` : "Out of stock"}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {compatibilityCount > 0 ? (
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              Compatible with {compatibilityCount} vehicle setup{compatibilityCount === 1 ? "" : "s"}
                            </span>
                          ) : (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                              No fitment rows yet
                            </span>
                          )}

                          {Number(part?.ranking_score || 0) >= 100 ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              High relevance
                            </span>
                          ) : null}
                        </div>

                        <div className="border-t border-gray-100 pt-3 space-y-2">
                          <p className="text-sm text-gray-500">
                            Seller:{" "}
                            {part.seller_slug ? (
                              <Link
                                to={`/sellers/${part.seller_slug}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-semibold text-blue-700 hover:underline"
                              >
                                {part.seller_name || "Unknown seller"}
                              </Link>
                            ) : (
                              part.seller_name || "Unknown seller"
                            )}
                          </p>

                          {getSellerBadges(part).length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {getSellerBadges(part).map((badge) => (
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
                          ) : null}

                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-blue-700">
                              View fitment
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleShortlist(part);
                              }}
                              className="inline-flex h-9 items-center justify-center rounded-2xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 transition hover:bg-gray-50"
                            >
                              {shortlistIds.includes(part.id) ? "Shortlisted" : "Shortlist"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {meta.totalPages > 1 ? (
                <div className="flex flex-wrap items-center justify-center gap-3 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                  <button
                    type="button"
                    disabled={meta.page <= 1}
                    onClick={() => goToPage(meta.page - 1)}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <span className="text-sm font-medium text-gray-700">
                    Page {meta.page} of {meta.totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => goToPage(meta.page + 1)}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {shortlist.length > 0 ? (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Shortlist
              </p>
              <p className="truncate text-sm font-semibold text-gray-900">
                {shortlist.length} saved part{shortlist.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/compare"
                className="inline-flex h-10 items-center justify-center rounded-2xl bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                Compare
              </Link>

              {shortlist.slice(-2).map((item) => (
                <Link
                  key={item.id}
                  to={`/parts/${item.slug}`}
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 transition hover:bg-gray-50"
                >
                  View
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {mobileFiltersOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/45 px-4 py-6 xl:hidden">
          <div className="mx-auto flex h-full max-w-lg flex-col rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Filters</h2>
                <p className="text-xs text-gray-500">Refine marketplace results</p>
              </div>

              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-gray-200 px-4 text-sm font-semibold text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {loadingMeta ? (
                <div className="text-sm text-gray-500">Loading filters...</div>
              ) : (
                FilterPanel
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
