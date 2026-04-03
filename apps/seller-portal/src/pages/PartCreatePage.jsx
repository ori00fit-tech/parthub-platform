import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

  if (suggestedBrand && !normalized.toLowerCase().includes(String(suggestedBrand.name || "").toLowerCase())) {
    suggestions.push(`${suggestedBrand.name} ${normalized}`.trim());
  }

  return [...new Set(suggestions)].filter(Boolean).slice(0, 3);
}


function buildCompatibilitySuggestions(form) {
  const title = String(form.title || "").toLowerCase();
  const notes = [];

  const vehicles = [
    { keys: ["audi a4"], label: "Audi A4 2014-2016 2.0 TDI" },
    { keys: ["audi a3"], label: "Audi A3 2013-2018 1.6 TDI" },
    { keys: ["bmw 3 series", "bmw 320"], label: "BMW 3 Series 2012-2018 320d" },
    { keys: ["golf", "vw golf", "volkswagen golf"], label: "Volkswagen Golf 2013-2020 2.0 TDI" },
    { keys: ["mercedes c class", "c220", "c class"], label: "Mercedes C-Class 2014-2019 C220 CDI" },
    { keys: ["ford focus"], label: "Ford Focus 2012-2018 1.5 TDCi" },
  ];

  const partHints = [
    {
      keys: ["turbo", "turbocharger"],
      templates: [
        "Confirm exact engine code before sale.",
        "Add make/model/year compatibility rows after creation.",
      ],
    },
    {
      keys: ["brake", "pads", "rotor", "disc"],
      templates: [
        "Specify front / rear axle in compatibility details.",
        "Brake fitment should match make/model/year precisely.",
      ],
    },
    {
      keys: ["filter", "oil filter", "air filter", "fuel filter"],
      templates: [
        "Include engine variant in fitment rows.",
        "Filter compatibility converts better when SKU and engine are both clear.",
      ],
    },
  ];

  for (const vehicle of vehicles) {
    if (vehicle.keys.some((key) => title.includes(key))) {
      notes.push(vehicle.label);
    }
  }

  for (const hint of partHints) {
    if (hint.keys.some((key) => title.includes(key))) {
      notes.push(...hint.templates);
    }
  }

  return [...new Set(notes)].slice(0, 4);
}

function buildFitmentHints(form) {
  const hints = [];
  const title = String(form.title || "").toLowerCase();

  if (title.includes("turbo")) {
    hints.push("Add make/model/year ranges for the exact engine variants using this turbo.");
  }
  if (title.includes("brake")) {
    hints.push("Brake parts convert better when compatibility rows and axle position are clear.");
  }
  if (title.includes("filter")) {
    hints.push("Filters need SKU and engine compatibility for stronger buyer confidence.");
  }
  if (!title) {
    hints.push("Add a clear part title first to unlock better suggestions.");
  }

  return hints.slice(0, 3);
}

export default function PartCreatePage() {
  const navigate = useNavigate();

  const [loadingMeta, setLoadingMeta] = useState(true);
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
    quantity: "1",
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
        setError("");

        const [categoriesRes, brandsRes] = await Promise.all([
          api.get("/api/v1/catalog/categories"),
          api.get("/api/v1/catalog/brands"),
        ]);

        if (!active) return;

        setCategories(normalizeList(categoriesRes, "categories"));
        setBrands(normalizeList(brandsRes, "brands"));
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load part form data");
      } finally {
        if (active) setLoadingMeta(false);
      }
    }

    loadMeta();

    return () => {
      active = false;
    };
  }, []);

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

  const compatibilitySuggestions = useMemo(
    () => buildCompatibilitySuggestions(form),
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

  function applyCompatibilitySuggestion(value) {
    setForm((prev) => {
      const current = String(prev.fitment_notes || "").trim();
      const nextValue = current ? `${current}\n${value}` : value;
      return {
        ...prev,
        fitment_notes: nextValue,
      };
    });
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

    if (!form.price) {
      setError("Price is required.");
      return;
    }

    if (!form.quantity && form.quantity !== "0") {
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

      const res = await api.post("/api/v1/marketplace/me/parts", payload);

      const createdId = res?.data?.id;
      setSuccess("Part created successfully.");

      if (createdId) {
        setTimeout(() => {
          navigate(`/parts/${createdId}/edit`);
        }, 700);
      } else {
        setTimeout(() => {
          navigate("/parts");
        }, 700);
      }
    } catch (err) {
      setError(err?.message || "Failed to create part");
    } finally {
      setSaving(false);
    }
  }

  if (loadingMeta) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading part creation form...
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
              Create part
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">Add a new listing</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              Create a seller listing with core product data, stock, pricing, and fitment notes.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/media-upload"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
            >
              Upload media
            </Link>
            <Link
              to="/parts"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Back to inventory
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Part details</h2>
            <p className="mt-1 text-sm text-gray-500">
              Fill in the essential fields for a clean seller listing.
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
              {saving ? "Creating..." : "Create part"}
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
              Suggestions based on your current inputs.
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
                Add a clearer title to unlock title cleanup suggestions.
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
              Listings with stronger compatibility data usually rank better and convert better for vehicle-aware buyers.
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">Compatibility suggestions</h2>
            <p className="mt-1 text-sm text-slate-600">
              Quick notes you can insert into fitment notes before adding structured compatibility rows.
            </p>

            {compatibilitySuggestions.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">
                Add a clearer vehicle or part title to unlock compatibility suggestions.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {compatibilitySuggestions.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="flex flex-col gap-3 rounded-2xl bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="text-sm font-semibold text-gray-900">{item}</p>
                    <button
                      type="button"
                      onClick={() => applyCompatibilitySuggestion(item)}
                      className="inline-flex h-10 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-100 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-200"
                    >
                      Add to notes
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
