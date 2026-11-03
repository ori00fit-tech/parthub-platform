import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiGet } from "../lib/api";
import { formatPrice } from "../lib/formatters";
import { mediaUrl } from "../lib/media";
import { useCart } from "../features/cart/CartContext";
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

// /catalog/parts doesn't return pagination yet; fall back to what was loaded.
function normalizeMeta(meta, loadedCount = 0) {
  const pagination = meta?.pagination || {};

  return {
    page: Number(pagination.page || 1),
    limit: Number(pagination.limit || 20),
    total: Number(pagination.total ?? loadedCount),
    totalPages: Number(pagination.total_pages || 1),
  };
}

function buildSearchParamsFromState(filters) {
  const params = new URLSearchParams();

  if (filters.q) params.set("search", filters.q);
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
      String(vehicle.make_name || vehicle.makeName || vehicle.make || "").toLowerCase()
    );
  }

  if (vehicle?.model || vehicle?.model_name || vehicle?.modelName) {
    params.set(
      "model",
      String(vehicle.model_name || vehicle.modelName || vehicle.model || "").toLowerCase()
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
      className: "bg-emerald-400/10 text-emerald-300",
    });
  } else if (Number(part?.partial_vehicle_match || 0) === 1 && hasVehicle) {
    badges.push({
      label: "Vehicle match",
      className: "bg-emerald-400/10 text-emerald-300",
    });
  }

  if (Number(part?.compatibility_count || 0) >= 3) {
    badges.push({
      label: "Strong compatibility",
      className: "bg-navy/20 text-link",
    });
  } else if (Number(part?.compatibility_count || 0) > 0) {
    badges.push({
      label: "Compatibility added",
      className: "bg-navy/20 text-link",
    });
  }

  if (Number(part?.featured || 0) === 1) {
    badges.push({
      label: "Featured",
      className: "bg-amber-400/10 text-amber-300",
    });
  }

  if (Number(part?.quantity || 0) > 0 && Number(part?.quantity || 0) <= 2) {
    badges.push({
      label: "Low stock",
      className: "bg-red-400/10 text-red-300",
    });
  }

  return badges.slice(0, 3);
}


function getSellerBadges(part) {
  const badges = [];

  if (Number(part?.compatibility_count || 0) > 0) {
    badges.push({
      label: "Fitment-ready seller",
      className: "bg-navy/20 text-link",
    });
  }

  if (Number(part?.quantity || 0) >= 5) {
    badges.push({
      label: "Well stocked",
      className: "bg-emerald-400/10 text-emerald-300",
    });
  }

  if (Number(part?.featured || 0) === 1) {
    badges.push({
      label: "Trusted seller",
      className: "bg-amber-400/10 text-amber-300",
    });
  }

  return badges.slice(0, 2);
}


function getOriginBadge(part) {
  const origin = String(part?.part_origin || "").toLowerCase();

  if (origin === "oem") {
    return {
      label: "OEM",
      className: "bg-navy text-white ring-1 ring-inset ring-white/15",
    };
  }

  if (origin === "used") {
    return {
      label: "Used",
      className: "border border-amber-400/35 bg-canvas/80 text-amber-300",
    };
  }

  return {
    label: "Aftermarket",
    className: "border border-line-strong bg-canvas/80 text-ink-2",
  };
}

function vehicleMatchesCard(part, vehicle) {
  if (!vehicle) return false;
  return Number(part?.exact_vehicle_match || 0) === 1;
}

export default function PartsPage() {
  const vehicleCtx = normalizeVehicleContext(useSelectedVehicle());
  const { selectedVehicle, hasVehicle, clearVehicle } = vehicleCtx;
  const { items: cartItems, addItem } = useCart();

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
        const response = await apiGet(`/api/v1/catalog/parts?${query}`);

        if (!active) return;

        const nextParts = normalizeList(response, "parts");
        setParts(nextParts);
        setMeta(normalizeMeta(response?.meta, nextParts.length));
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
        <label className="mb-1.5 block text-sm font-medium text-ink-2">
          Search
        </label>
        <input
          value={filters.q}
          onChange={setField("q")}
          placeholder="Search by title, SKU, keyword..."
          className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-2">
          Category
        </label>
        <select
          value={filters.category}
          onChange={setField("category")}
          className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
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
        <label className="mb-1.5 block text-sm font-medium text-ink-2">
          Brand
        </label>
        <select
          value={filters.brand}
          onChange={setField("brand")}
          className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
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
        <label className="mb-1.5 block text-sm font-medium text-ink-2">
          Condition
        </label>
        <select
          value={filters.condition}
          onChange={setField("condition")}
          className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
        >
          <option value="">All conditions</option>
          <option value="new">New</option>
          <option value="used">Used</option>
          <option value="refurbished">Refurbished</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">
            Min price
          </label>
          <input
            value={filters.min_price}
            onChange={setField("min_price")}
            inputMode="numeric"
            placeholder="0"
            className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">
            Max price
          </label>
          <input
            value={filters.max_price}
            onChange={setField("max_price")}
            inputMode="numeric"
            placeholder="50000"
            className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-2">
          Sort
        </label>
        <select
          value={filters.sort}
          onChange={setField("sort")}
          className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400"
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
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-line bg-surface px-4 text-sm font-semibold text-ink-2 transition hover:bg-white/5"
        >
          Clear filters
        </button>

        {hasVehicle ? (
          <button
            type="button"
            onClick={clearVehicle}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-red-400/30 bg-red-400/10 px-4 text-sm font-semibold text-red-300 transition hover:bg-red-400/20"
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
              className="inline-flex items-center justify-center rounded-2xl bg-surface px-5 py-3 text-sm font-semibold text-ink transition hover:bg-navy/30 xl:hidden"
            >
              Filters
            </button>

            <button
              type="button"
              onClick={handleSaveSearch}
              className="inline-flex items-center justify-center rounded-2xl bg-surface px-5 py-3 text-sm font-semibold text-ink transition hover:bg-navy/30"
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
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-ink">Filters</h2>
              <p className="mt-1 text-sm text-muted">
                Refine results for faster matching.
              </p>
            </div>

            {loadingMeta ? (
              <div className="text-sm text-muted">Loading filters...</div>
            ) : (
              FilterPanel
            )}
          </div>

          <GaragePanel />
          <SavedSearchesPanel onLoadSearch={handleLoadSavedSearch} />
        </aside>

        <div className="space-y-5">
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-lg font-bold text-ink">{resultsLabel}</p>
                <p className="mt-1 text-sm text-muted">
                  {hasVehicle
                    ? `${exactMatchesCount} exact match${exactMatchesCount === 1 ? "" : "es"} for ${vehicleLabel}`
                    : "Showing broader marketplace results"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveSearch}
                  className="rounded-full bg-navy/20 px-3 py-1 text-xs font-semibold text-link transition hover:bg-navy/30"
                >
                  Save this search
                </button>
                {filters.q ? (
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-2">
                    Search: {filters.q}
                  </span>
                ) : null}

                {filters.category ? (
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-2">
                    Category: {filters.category}
                  </span>
                ) : null}

                {filters.brand ? (
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-2">
                    Brand: {filters.brand}
                  </span>
                ) : null}

                {hasVehicle ? (
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    Vehicle-aware
                  </span>
                ) : null}
              </div>
            </div>

            {hasVehicle ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                    Exact matches
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-200">{exactMatchesCount}</p>
                </div>

                <div className="rounded-2xl border border-navy/70 bg-navy/20 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-link">
                    Broader fitment candidates
                  </p>
                  <p className="mt-1 text-2xl font-bold text-link">{partialMatchesCount}</p>
                </div>
              </div>
            ) : null}
          </div>

          {!hasVehicle ? (
            <div className="rounded-3xl border border-navy/70 bg-navy/20 px-4 py-3 text-sm text-link shadow-sm">
              Select your vehicle to unlock exact fitment ranking and stronger part matching.
            </div>
          ) : null}

          {!loading && !error && topMatch ? (
            <div className="rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-400/10 to-surface p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 inline-flex rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                    Top result
                  </div>
                  <h3 className="truncate text-xl font-bold text-ink">{topMatch.title}</h3>
                  <p className="mt-1 text-sm text-muted">
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
                  <div className="flex items-center rounded-2xl bg-surface px-4 py-3 text-lg font-bold text-ink shadow-sm">
                    {formatPrice(topMatch.price)}
                  </div>

                  <Link
                    to={`/parts/${topMatch.slug}`}
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy-deep"
                  >
                    View best match
                  </Link>

                  <button
                    type="button"
                    onClick={() => toggleShortlist(topMatch)}
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-line bg-surface px-5 text-sm font-semibold text-ink-2 transition hover:bg-white/5"
                  >
                    {shortlistIds.includes(topMatch.id) ? "Remove from shortlist" : "Add to shortlist"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-3xl border border-red-400/30 bg-red-400/10 p-6 text-red-300 shadow-sm">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm"
                >
                  <div className="h-44 animate-pulse bg-surface-2" />
                  <div className="space-y-3 p-4">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-surface-2" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-surface-2" />
                    <div className="h-10 w-full animate-pulse rounded bg-surface-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : parts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line-strong bg-surface p-8 shadow-sm sm:p-10">
              <div className="max-w-2xl">
                <h3 className="text-xl font-bold text-ink">
                  {hasVehicle
                    ? "No exact matches found for your selected vehicle"
                    : "No parts found"}
                </h3>

                <p className="mt-2 text-sm text-muted">
                  {hasVehicle
                    ? "No listings matched your current vehicle and filter combination."
                    : "No listings matched your current search and filter combination."}
                </p>

                <div className="mt-5 space-y-3">
                  {emptyStateHints.map((hint, index) => (
                    <div
                      key={index}
                      className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-ink-2"
                    >
                      {hint}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy-deep"
                  >
                    Reset search filters
                  </button>

                  <Link
                    to={`/request-part${searchParams.get("q") ? `?part=${encodeURIComponent(searchParams.get("q"))}` : ""}`}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-navy/70 bg-navy/20 px-5 text-sm font-semibold text-link transition hover:bg-navy/30"
                  >
                    Can't find it? Request this part
                  </Link>

                  {hasVehicle ? (
                    <button
                      type="button"
                      onClick={clearVehicle}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-line bg-surface px-5 text-sm font-semibold text-ink-2 transition hover:bg-white/5"
                    >
                      Clear vehicle filter
                    </button>
                  ) : null}

                  <Link
                    to="/parts"
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-line bg-surface px-5 text-sm font-semibold text-ink-2 transition hover:bg-white/5"
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

                  const inStock = Number(part.quantity || 0) > 0;
                  const lowStock = inStock && Number(part.quantity) <= 3;
                  const origin = getOriginBadge(part);
                  const inCart = cartItems.some((item) => item.part_id === part.id);

                  return (
                    <article
                      key={part.id}
                      className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-panel transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift"
                    >
                      {/* Whole card opens the part; buttons and links sit above this. */}
                      <Link to={`/parts/${part.slug}`} className="absolute inset-0 z-0" aria-label={part.title} />

                      <div className="media-well relative flex aspect-[4/3] max-w-full items-center justify-center overflow-hidden border-b border-line">
                        {part.image_url ? (
                          <img
                            src={mediaUrl(part.image_url)}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <svg viewBox="0 0 64 64" className="h-20 w-20 text-[#46587A]" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                            <circle cx="32" cy="32" r="9" />
                            <path d="M32 6v8M32 50v8M6 32h8M50 32h8M13.6 13.6l5.7 5.7M44.7 44.7l5.7 5.7M13.6 50.4l5.7-5.7M44.7 19.3l5.7-5.7" strokeLinecap="round" />
                            <circle cx="32" cy="32" r="20" strokeDasharray="4 5" />
                          </svg>
                        )}

                        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
                          <span className={["rounded px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em]", origin.className].join(" ")}>
                            {origin.label}
                          </span>
                          <span className="rounded border border-line-strong bg-canvas/80 px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-2">
                            {part.condition}
                          </span>
                        </div>

                        {part.sku ? (
                          <span className="absolute bottom-2 right-2.5 font-mono text-[10.5px] tracking-[0.06em] text-[#6E81A3]">
                            {part.sku}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-1 flex-col gap-3 p-3.5">
                        <div className="flex items-center justify-between gap-2 text-xs text-muted">
                          <span className="truncate font-semibold uppercase tracking-[0.08em] text-[#A9BBF5]">
                            {part.brand_name || "Unbranded"}
                          </span>
                          {part.category_name ? <span className="truncate">{part.category_name}</span> : null}
                        </div>

                        <h3 className="line-clamp-2 font-sans text-[15.5px] font-semibold leading-snug text-ink">{part.title}</h3>

                        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 gap-y-0.5 rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-xs">
                          <dt className="self-center text-[10.5px] uppercase tracking-[0.06em] text-muted">SKU</dt>
                          <dd className="break-all font-mono text-ink">{part.sku || "—"}</dd>
                          <dt className="self-center text-[10.5px] uppercase tracking-[0.06em] text-muted">Seller</dt>
                          <dd className="relative z-10 min-w-0 truncate">
                            {part.seller_slug ? (
                              <Link to={`/sellers/${part.seller_slug}`} className="font-semibold text-link hover:underline">
                                {part.seller_name || "Unknown seller"}
                              </Link>
                            ) : (
                              <span className="text-ink-2">{part.seller_name || "Unknown seller"}</span>
                            )}
                            {part.seller_location ? <span className="text-faint"> · {part.seller_location}</span> : null}
                          </dd>
                        </dl>

                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className={[
                              "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium before:h-1.5 before:w-1.5 before:rounded-full before:bg-current",
                              !inStock
                                ? "border-red-400/25 bg-red-400/10 text-red-300"
                                : lowStock
                                ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
                                : "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
                            ].join(" ")}
                          >
                            {!inStock ? "Out of stock" : lowStock ? `Low stock · ${part.quantity} left` : `In stock · ${part.quantity}`}
                          </span>

                          {exactMatched ? (
                            <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 text-xs font-medium text-emerald-300 before:h-1.5 before:w-1.5 before:rounded-full before:bg-current">
                              Fits your vehicle
                            </span>
                          ) : compatibilityCount > 0 ? (
                            <span className="inline-flex h-6 items-center rounded-full border border-line bg-white/[0.03] px-2.5 text-xs font-medium text-muted">
                              Fits {compatibilityCount} vehicle setup{compatibilityCount === 1 ? "" : "s"}
                            </span>
                          ) : (
                            <span className="inline-flex h-6 items-center rounded-full border border-line bg-white/[0.03] px-2.5 text-xs font-medium text-faint">
                              No fitment data yet
                            </span>
                          )}

                          {rankingBadges.filter((badge) => !/stock/i.test(badge.label)).slice(0, 2).map((badge) => (
                            <span key={badge.label} className={["inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium", badge.className].join(" ")}>
                              {badge.label}
                            </span>
                          ))}
                          {getSellerBadges(part).slice(0, 1).map((badge) => (
                            <span key={badge.label} className={["inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium", badge.className].join(" ")}>
                              {badge.label}
                            </span>
                          ))}
                        </div>

                        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
                          <div className="font-mono tabular-nums">
                            {part.compare_price ? (
                              <s className="mb-1 block text-xs text-faint">{formatPrice(part.compare_price)}</s>
                            ) : null}
                            <span className="text-[22px] font-semibold leading-none text-white">{formatPrice(part.price)}</span>
                          </div>

                          <div className="relative z-10 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleShortlist(part)}
                              aria-pressed={shortlistIds.includes(part.id)}
                              aria-label={shortlistIds.includes(part.id) ? "Remove from shortlist" : "Add to shortlist"}
                              title={shortlistIds.includes(part.id) ? "Shortlisted" : "Shortlist"}
                              className={[
                                "flex h-[42px] w-[42px] items-center justify-center rounded-xl border transition",
                                shortlistIds.includes(part.id)
                                  ? "border-navy bg-navy/30 text-white"
                                  : "border-line-strong text-muted hover:border-muted hover:text-ink",
                              ].join(" ")}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill={shortlistIds.includes(part.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M6 3h12v18l-6-4-6 4z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              disabled={!inStock}
                              onClick={() =>
                                addItem({
                                  part_id: part.id,
                                  slug: part.slug,
                                  title: part.title,
                                  thumbnail: part.image_url || null,
                                  seller_name: part.seller_name || "",
                                  price: part.price,
                                })
                              }
                              className="btn-cta h-[42px] rounded-xl px-3.5 text-sm"
                            >
                              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                                <path d="M12 5v14M5 12h14" />
                              </svg>
                              {inStock ? (inCart ? "Add more" : "Add to Cart") : "Sold out"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {meta.totalPages > 1 ? (
                <div className="flex flex-wrap items-center justify-center gap-3 rounded-3xl border border-line bg-surface p-4 shadow-sm">
                  <button
                    type="button"
                    disabled={meta.page <= 1}
                    onClick={() => goToPage(meta.page - 1)}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-line bg-surface px-4 text-sm font-semibold text-ink-2 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <span className="text-sm font-medium text-ink-2">
                    Page {meta.page} of {meta.totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => goToPage(meta.page + 1)}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-line bg-surface px-4 text-sm font-semibold text-ink-2 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-surface/95 px-4 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                Shortlist
              </p>
              <p className="truncate text-sm font-semibold text-ink">
                {shortlist.length} saved part{shortlist.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/compare"
                className="inline-flex h-10 items-center justify-center rounded-2xl bg-navy px-4 text-xs font-semibold text-white transition hover:bg-navy-deep"
              >
                Compare
              </Link>

              {shortlist.slice(-2).map((item) => (
                <Link
                  key={item.id}
                  to={`/parts/${item.slug}`}
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-line bg-surface px-3 text-xs font-semibold text-ink-2 transition hover:bg-white/5"
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
          <div className="mx-auto flex h-full max-w-lg flex-col rounded-[28px] bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-ink">Filters</h2>
                <p className="text-xs text-muted">Refine marketplace results</p>
              </div>

              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-line px-4 text-sm font-semibold text-ink-2"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {loadingMeta ? (
                <div className="text-sm text-muted">Loading filters...</div>
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
