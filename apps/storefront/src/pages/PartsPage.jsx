import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiGet } from "../lib/api";
import { formatPriceGBP } from "../lib/formatters";

export default function PartsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "";

  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Failed to load catalog");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (category) next.set("category", category);
    else next.delete("category");
    setSearchParams(next, { replace: true });
  }, [category]);

  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
      const matchesQuery = query.trim()
        ? [
            part.title,
            part.description,
            part.brand_name,
            part.category_name,
            part.sku,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query.trim().toLowerCase())
        : true;

      const matchesCategory = category ? part.category_slug === category : true;

      return matchesQuery && matchesCategory;
    });
  }, [parts, query, category]);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">Auto parts catalog</h1>
            <p className="text-sm text-gray-500">
              Search, filter, and explore live UK inventory.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by part name, SKU, brand..."
              className="h-12 rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-blue-500"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-12 rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-blue-500"
            >
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          Loading parts...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {filteredParts.length} part{filteredParts.length === 1 ? "" : "s"} found
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredParts.map((part) => (
          <article
            key={part.id}
            className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{part.title}</h2>
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
              <p>SKU: {part.sku || "-"}</p>
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

      {!loading && !error && filteredParts.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm">
          No parts match your search.
        </div>
      ) : null}
    </section>
  );
}
