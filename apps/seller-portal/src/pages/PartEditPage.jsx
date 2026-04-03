import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeList(payload, keyName) {
  const list =
    payload?.data?.[keyName] ||
    payload?.data ||
    payload?.[keyName] ||
    [];

  return Array.isArray(list) ? list : [];
}

function normalizePart(payload) {
  return payload?.data || payload || null;
}

function suggestCategory(title, categories) {
  const t = String(title || "").toLowerCase();

  const rules = [
    { keywords: ["brake", "pad", "rotor", "disc"], slugHints: ["brakes", "brake", "brakes-rotors"] },
    { keywords: ["filter", "oil filter", "air filter", "fuel filter"], slugHints: ["filters", "filter"] },
    { keywords: ["turbo", "intercooler"], slugHints: ["engine", "turbo"] },
    { keywords: ["lamp", "headlight", "taillight", "light"], slugHints: ["lighting", "lights"] },
    { keywords: ["suspension", "shock", "strut", "spring"], slugHints: ["suspension"] },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => t.includes(keyword))) {
      const match = categories.find((item) =>
        rule.slugHints.includes(String(item.slug || "").toLowerCase())
      );
      if (match) return match;
    }
  }

  return null;
}

function suggestBrand(title, brands) {
  const t = String(title || "").toLowerCase();
  return brands.find((item) => t.includes(String(item.name || "").toLowerCase())) || null;
}

function buildTitleSuggestions(form, suggestedBrand) {
  const suggestions = [];
  const rawTitle = String(form.title || "").trim();

  if (!rawTitle) return suggestions;

  const normalized = rawTitle
    .replace(/\s+/g, " ")
    .replace(/\btest\b/gi, "")
    .trim();

  if (normalized && normalized !== rawTitle) {
    suggestions.push(normalized);
  }

  if (
    suggestedBrand &&
    !normalized.toLowerCase().includes(String(suggestedBrand.name || "").toLowerCase())
  ) {
    suggestions.push(`${suggestedBrand.name} ${normalized}`.trim());
  }

  return [...new Set(suggestions)].filter(Boolean).slice(0, 3);
}

function buildFitmentHints(form) {
  const hints = [];
  const title = String(form.title || "").toLowerCase();

  if (title.includes("turbo")) {
    hints.push("Turbo parts perform better when engine variants and exact year ranges are explicit.");
  }
  if (title.includes("brake")) {
    hints.push("Brake listings convert better when fitment rows and axle/position context are clear.");
  }
  if (title.includes("filter")) {
    hints.push("Filters should include SKU and engine compatibility for stronger buyer trust.");
  }
  if (!title) {
    hints.push("Add or refine the title to unlock stronger listing suggestions.");
  }

  return hints.slice(0, 3);
}

export default function PartEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingPart, setLoadingPart] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    sku: "",
    category_id: "",
    brand_id: "",
    price: "",
    compare_price: "",
    quantity: "0",
    condition: "new",
    status: "active",
    image_url: "",
    fitment_notes: "",
    weight_kg: "",
    featured: false,
  });

  useEffect(() => {
    let active = true;

    async function loadMeta() {
      try {
        setLoadingMeta(true);

        const [categoriesRes, brandsRes] = await Promise.all([
          api.get("/api/v1/catalog/categories"),
          api.get("/api/v1/catalog/brands"),
        ]);

        if (!active) return;

        setCategories(normalizeList(categoriesRes, "categories"));
        setBrands(normalizeList(brandsRes, "brands"));
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load edit form data");
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

    async function loadPart() {
      try {
        setLoadingPart(true);
        setError("");
        setSuccess("");

        const res = await api.get(`/api/v1/marketplace/me/parts/${id}`);
        if (!active) return;

        const part = normalizePart(res);
        if (!part) {
          throw new Error("Part not found");
        }

        setForm({
          title: part.title || "",
          slug: part.slug || "",
          description: part.description || "",
          sku: part.sku || "",
          category_id: part.category_id ? String(part.category_id) : "",
          brand_id: part.brand_id ? String(part.brand_id) : "",
          price: part.price ?? "",
          compare_price: part.compare_price ?? "",
          quantity: part.quantity ?? "0",
          condition: part.condition || "new",
          status: part.status || "active",
          image_url: part.image_url || "",
          fitment_notes:
            Array.isArray(part.fitment_notes)
              ? part.fitment_notes.join(", ")
              : part.fitment_notes || "",
          weight_kg: part.weight_kg ?? "",
          featured: Boolean(part.featured),
        });
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load part");
      } finally {
        if (active) setLoadingPart(false);
      }
    }

    loadPart();

    return () => {
      active = false;
    };
  }, [id]);

  const computedSlug = useMemo(() => {
    return form.slug || slugify(form.title);
  }, [form.slug, form.title]);

  const suggestedCategory = useMemo(
    () => suggestCategory(form.title, categories),
    [form.title, categories]
  );

  const suggestedBrand = useMemo(
    () => suggestBrand(form.title, brands),
    [form.title, brands]
  );

  const titleSuggestions = useMemo(
    () => buildTitleSuggestions(form, suggestedBrand),
    [form, suggestedBrand]
  );

  const fitmentHints = useMemo(
    () => buildFitmentHints(form),
    [form]
  );

  function setField(key) {
    return (e) => {
      const value =
        e.target.type === "checkbox" ? e.target.checked : e.target.value;

      setError("");
      setSuccess("");

      setForm((prev) => ({
        ...prev,
        [key]: value,
      }));
    };
  }

  function applySuggestedSlug() {
    setForm((prev) => ({
      ...prev,
      slug: slugify(prev.title),
    }));
  }

  function applySuggestedCategory() {
    if (!suggestedCategory) return;
    setForm((prev) => ({
      ...prev,
      category_id: String(suggestedCategory.id),
    }));
  }

  function applySuggestedBrand() {
    if (!suggestedBrand) return;
    setForm((prev) => ({
      ...prev,
      brand_id: String(suggestedBrand.id),
    }));
  }

  function applyTitleSuggestion(value) {
    setForm((prev) => ({
      ...prev,
      title: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Part title is required.");
      return;
    }

    if (!computedSlug.trim()) {
      setError("Part slug is required.");
      return;
    }

    if (!form.category_id) {
      setError("Category is required.");
      return;
    }

    if (form.price === "" || form.price === null) {
      setError("Price is required.");
      return;
    }

    if (form.quantity === "" || form.quantity === null) {
      setError("Quantity is required.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: form.title.trim(),
        slug: computedSlug.trim(),
        description: form.description.trim(),
        sku: form.sku.trim(),
        category_id: Number(form.category_id),
        brand_id: form.brand_id ? Number(form.brand_id) : null,
        price: Number(form.price),
        compare_price: form.compare_price ? Number(form.compare_price) : null,
        quantity: Number(form.quantity),
        condition: form.condition,
        status: form.status,
        image_url: form.image_url.trim() || null,
        fitment_notes: form.fitment_notes.trim() || null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        featured: Boolean(form.featured),
      };

      await api.put(`/api/v1/marketplace/me/parts/${id}`, payload);
      setSuccess("Part updated successfully.");
    } catch (err) {
      setError(err?.message || "Failed to update part");
    } finally {
      setSaving(false);
    }
  }

  if (loadingMeta || loadingPart) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading part editor...
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              Edit part
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">Update your listing</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              Refine your seller listing, adjust stock, pricing, and improve product presentation.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/parts"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
            >
              Back to inventory
            </Link>
            <Link
              to="/media-upload"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Upload media
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Part details</h2>
            <p className="mt-1 text-sm text-gray-500">
              Edit your product data and keep the listing accurate.
            </p>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                value={form.title}
                onChange={setField("title")}
                placeholder="Bosch Front Brake Pads Set"
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Slug
              </label>
              <div className="flex gap-3">
                <input
                  value={form.slug}
                  onChange={setField("slug")}
                  placeholder={computedSlug || "your-part-slug"}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={applySuggestedSlug}
                  className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                >
                  Use slug
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Preview: {computedSlug || "your-part-slug"}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                SKU
              </label>
              <input
                value={form.sku}
                onChange={setField("sku")}
                placeholder="BOSCH-FBP-001"
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Brand
              </label>
              <div className="flex gap-3">
                <select
                  value={form.brand_id}
                  onChange={setField("brand_id")}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
                >
                  <option value="">Select brand</option>
                  {brands.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                {suggestedBrand ? (
                  <button
                    type="button"
                    onClick={applySuggestedBrand}
                    className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                  >
                    Match
                  </button>
                ) : null}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Category
              </label>
              <div className="flex gap-3">
                <select
                  value={form.category_id}
                  onChange={setField("category_id")}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
                >
                  <option value="">Select category</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                {suggestedCategory ? (
                  <button
                    type="button"
                    onClick={applySuggestedCategory}
                    className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                  >
                    Suggest
                  </button>
                ) : null}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Price
              </label>
              <input
                value={form.price}
                onChange={setField("price")}
                inputMode="numeric"
                placeholder="35000"
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Compare price
              </label>
              <input
                value={form.compare_price}
                onChange={setField("compare_price")}
                inputMode="numeric"
                placeholder="42000"
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Quantity
              </label>
              <input
                value={form.quantity}
                onChange={setField("quantity")}
                inputMode="numeric"
                placeholder="1"
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Condition
              </label>
              <select
                value={form.condition}
                onChange={setField("condition")}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              >
                <option value="new">New</option>
                <option value="used">Used</option>
                <option value="refurbished">Refurbished</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={form.status}
                onChange={setField("status")}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Image URL
              </label>
              <input
                value={form.image_url}
                onChange={setField("image_url")}
                placeholder="https://..."
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={setField("description")}
                rows={5}
                placeholder="Describe the part, condition, and trust signals..."
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Fitment notes
              </label>
              <textarea
                value={form.fitment_notes}
                onChange={setField("fitment_notes")}
                rows={4}
                placeholder="Audi A4 2014-2016 2.0 TDI S Line..."
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Weight (kg)
              </label>
              <input
                value={form.weight_kg}
                onChange={setField("weight_kg")}
                inputMode="decimal"
                placeholder="8.5"
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-end">
              <label className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={setField("featured")}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Featured listing
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>

            <Link
              to="/parts"
              className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>

        <div className="space-y-6">
          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-950">Listing assistant</h2>
            <p className="mt-1 text-sm text-slate-600">
              Suggestions based on your current listing fields.
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-white/80 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Suggested slug</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {computedSlug || "Waiting for title"}
                </p>
              </div>

              <div className="rounded-2xl bg-white/80 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Suggested category</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {suggestedCategory?.name || "No strong category signal yet"}
                </p>
              </div>

              <div className="rounded-2xl bg-white/80 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Suggested brand</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {suggestedBrand?.name || "No brand detected in title"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Title suggestions</h2>

            {titleSuggestions.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                Refine the title to unlock cleanup suggestions.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {titleSuggestions.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="text-sm font-semibold text-gray-900">{item}</p>
                    <button
                      type="button"
                      onClick={() => applyTitleSuggestion(item)}
                      className="inline-flex h-10 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                    >
                      Use title
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Fitment guidance</h2>

            <div className="mt-4 space-y-3">
              {fitmentHints.map((item, index) => (
                <div key={index} className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
                  {item}
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Listings with clearer compatibility context usually rank better and reduce buyer hesitation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
