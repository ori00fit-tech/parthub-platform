import { useMemo, useState } from "react";

const API_BASE = "https://parthub-api.ori00fit-c96.workers.dev";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function PartCreateWithUploadPage() {
  const [form, setForm] = useState({
    seller_id: 1,
    category_id: 2,
    brand_id: 1,
    title: "",
    slug: "",
    description: "",
    sku: "",
    price: "",
    compare_price: "",
    condition: "new",
    quantity: 1,
    weight_kg: "",
    status: "active",
    featured: true,
  });

  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const computedSlug = useMemo(() => {
    return form.slug || slugify(form.title);
  }, [form.slug, form.title]);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleUpload() {
    setError("");
    if (!file) {
      setError("Choose an image first.");
      return;
    }

    try {
      setUploading(true);

      const body = new FormData();
      body.append("file", file);

      const res = await fetch(`${API_BASE}/api/v1/media/upload`, {
        method: "POST",
        body,
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error?.message || "Upload failed");
      }

      setImageUrl(data.data.url);
      setPreviewUrl(data.data.url);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(null);

    try {
      setSaving(true);

      const payload = {
        seller_id: Number(form.seller_id),
        category_id: Number(form.category_id),
        brand_id: form.brand_id ? Number(form.brand_id) : null,
        slug: computedSlug,
        title: form.title,
        description: form.description,
        sku: form.sku,
        price: Number(form.price),
        compare_price:
          form.compare_price !== "" ? Number(form.compare_price) : null,
        condition: form.condition,
        quantity: Number(form.quantity || 1),
        weight_kg: form.weight_kg !== "" ? Number(form.weight_kg) : null,
        status: form.status,
        featured: !!form.featured,
        image_url: imageUrl || null,
      };

      const res = await fetch(`${API_BASE}/api/v1/marketplace/parts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error?.message || "Create part failed");
      }

      setSuccess(data.data);
      setForm({
        seller_id: 1,
        category_id: 2,
        brand_id: 1,
        title: "",
        slug: "",
        description: "",
        sku: "",
        price: "",
        compare_price: "",
        condition: "new",
        quantity: 1,
        weight_kg: "",
        status: "active",
        featured: true,
      });
      setFile(null);
      setImageUrl("");
      setPreviewUrl("");
    } catch (err) {
      setError(err.message || "Create part failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Create part + upload image</h1>
        <p className="text-sm text-gray-500">
          Upload product media to R2, then save the part in D1 in one flow.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Title</span>
            <input
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3"
              placeholder="Front Brake Pads Kit"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Slug</span>
            <input
              value={form.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3"
              placeholder={computedSlug || "auto-generated-from-title"}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Seller ID</span>
            <input
              type="number"
              value={form.seller_id}
              onChange={(e) => updateField("seller_id", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Category ID</span>
            <input
              type="number"
              value={form.category_id}
              onChange={(e) => updateField("category_id", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Brand ID</span>
            <input
              type="number"
              value={form.brand_id}
              onChange={(e) => updateField("brand_id", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">SKU</span>
            <input
              value={form.sku}
              onChange={(e) => updateField("sku", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3"
              placeholder="BRK-1001"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Price (pence)</span>
            <input
              type="number"
              value={form.price}
              onChange={(e) => updateField("price", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3"
              placeholder="3800"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Compare price (pence)</span>
            <input
              type="number"
              value={form.compare_price}
              onChange={(e) => updateField("compare_price", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3"
              placeholder="4200"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Condition</span>
            <select
              value={form.condition}
              onChange={(e) => updateField("condition", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3"
            >
              <option value="new">new</option>
              <option value="used">used</option>
              <option value="refurbished">refurbished</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Quantity</span>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => updateField("quantity", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Weight (kg)</span>
            <input
              type="number"
              step="0.1"
              value={form.weight_kg}
              onChange={(e) => updateField("weight_kg", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Status</span>
            <select
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3"
            >
              <option value="active">active</option>
              <option value="draft">draft</option>
              <option value="pending">pending</option>
            </select>
          </label>
        </div>

        <label className="space-y-2 block">
          <span className="text-sm font-medium">Description</span>
          <textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            className="min-h-[120px] w-full rounded-xl border border-gray-200 px-4 py-3"
            placeholder="Describe the part..."
          />
        </label>

        <div className="rounded-2xl border border-dashed border-gray-300 p-4 space-y-4">
          <div>
            <h2 className="text-lg font-bold">Product image</h2>
            <p className="text-sm text-gray-500">
              Upload first, then the image URL will be attached automatically.
            </p>
          </div>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm"
          />

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Upload image"}
          </button>

          {imageUrl ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-gray-50 p-3 text-sm break-all">
                {imageUrl}
              </div>
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                <img src={previewUrl} alt="Preview" className="w-full object-cover" />
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
        >
          {saving ? "Saving part..." : "Create part"}
        </button>
      </form>

      {success ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-green-800">
          <h2 className="text-lg font-bold">Part created successfully</h2>
          <div className="mt-3 space-y-1 text-sm">
            <p><span className="font-semibold">ID:</span> {success.id}</p>
            <p><span className="font-semibold">Title:</span> {success.title}</p>
            <p><span className="font-semibold">Slug:</span> {success.slug}</p>
            <p><span className="font-semibold">Price:</span> {success.price}</p>
            <p><span className="font-semibold">Image:</span> {success.image_url || "No image"}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
