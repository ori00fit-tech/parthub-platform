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

  function setField(key) {
    return (e) => {
      const value =
        e.target.type === "checkbox" ? e.target.checked : e.target.value;

      setError("");
      setSuccess("");

      setForm((prev) => {
        if (key === "title" && !prev.slug) {
          return {
            ...prev,
            title: value,
          };
        }

        return {
          ...prev,
          [key]: value,
        };
      });
    };
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
            <p className="mt-2 text-xs text-blue-100/80">
              After creating the part, you will be redirected to the edit page to add vehicle compatibility.
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

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
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
              <input
                value={form.slug}
                onChange={setField("slug")}
                placeholder={computedSlug || "bosch-front-brake-pads-set"}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
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
                Condition
              </label>
              <select
                value={form.condition}
                onChange={setField("condition")}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
              >
                <option value="new">New</option>
                <option value="used">Used</option>
                <option value="refurbished">Refurbished</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                value={form.category_id}
                onChange={setField("category_id")}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Brand
              </label>
              <select
                value={form.brand_id}
                onChange={setField("brand_id")}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
              >
                <option value="">Select brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={setField("price")}
                placeholder="59.99"
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Compare price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.compare_price}
                onChange={setField("compare_price")}
                placeholder="79.99"
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Quantity
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.quantity}
                onChange={setField("quantity")}
                placeholder="10"
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Weight (kg)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.weight_kg}
                onChange={setField("weight_kg")}
                placeholder="1.20"
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
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
                rows={5}
                value={form.description}
                onChange={setField("description")}
                placeholder="Describe the part, its quality, compatibility, and important details..."
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Fitment notes
              </label>
              <textarea
                rows={4}
                value={form.fitment_notes}
                onChange={setField("fitment_notes")}
                placeholder="Compatible with Audi A4 B8 2013–2015, front axle..."
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={form.status}
                onChange={setField("status")}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={setField("featured")}
                  className="h-4 w-4"
                />
                Mark as featured
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {saving ? "Creating..." : "Create part"}
            </button>

            <Link
              to="/media-upload"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              Upload media first
            </Link>
          </div>
        </form>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Listing preview</h2>

            <div className="mt-5 overflow-hidden rounded-3xl border border-gray-200 bg-white">
              <div className="h-52 bg-gray-100">
                {form.image_url ? (
                  <img
                    src={form.image_url}
                    alt={form.title || "Part preview"}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {form.title || "Your part title"}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {brands.find((b) => String(b.id) === String(form.brand_id))?.name || "Brand"} •{" "}
                      {categories.find((c) => String(c.id) === String(form.category_id))?.name || "Category"}
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {form.status || "active"}
                  </span>
                </div>

                <p className="mt-4 text-sm text-gray-600">
                  {form.description || "Listing description preview will appear here."}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
                  <p>SKU: {form.sku || "—"}</p>
                  <p>Stock: {form.quantity || "0"}</p>
                  <p>Slug: {computedSlug || "—"}</p>
                  <p>Condition: {form.condition || "—"}</p>
                </div>

                <p className="mt-5 text-2xl font-bold text-gray-900">
                  {form.price ? form.price : "0.00"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Create flow notes</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="rounded-2xl bg-gray-50 p-4">
                A clean title, SKU, and fitment note improve listing quality.
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                Upload image assets first if you want a stronger-looking listing.
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                Draft status is useful before publishing more sensitive listings.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
