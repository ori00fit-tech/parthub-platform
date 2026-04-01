import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCategories(payload) {
  const list =
    payload?.data?.items ||
    payload?.data?.categories ||
    payload?.data ||
    payload?.items ||
    payload?.categories ||
    [];

  return Array.isArray(list) ? list : [];
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    parent_id: "",
    icon: "",
  });

  async function loadCategories() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/v1/admin/categories");
      setCategories(normalizeCategories(res));
    } catch (err) {
      setCategories([]);
      setError(err?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""))
    );
  }, [categories]);

  function setField(key) {
    return (e) => {
      const value = e.target.value;
      setError("");
      setSuccess("");

      setForm((prev) => {
        if (key === "name" && !prev.slug) {
          return {
            ...prev,
            name: value,
            slug: slugify(value),
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

    if (!form.name.trim()) {
      setError("Category name is required.");
      return;
    }

    if (!form.slug.trim()) {
      setError("Category slug is required.");
      return;
    }

    try {
      setSaving(true);

      await api.post("/api/v1/admin/categories", {
        name: form.name.trim(),
        slug: form.slug.trim(),
        parent_id: form.parent_id ? Number(form.parent_id) : null,
        icon: form.icon.trim() || null,
      });

      setSuccess("Category created successfully.");
      setForm({
        name: "",
        slug: "",
        parent_id: "",
        icon: "",
      });

      await loadCategories();
    } catch (err) {
      setError(err?.message || "Failed to create category");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-gray-800 bg-gradient-to-br from-gray-900 via-slate-950 to-blue-950 p-6 text-white shadow-xl sm:p-8">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
            Categories management
          </div>
          <h1 className="text-3xl font-bold sm:text-5xl">Marketplace categories</h1>
          <p className="mt-3 text-sm text-gray-300 sm:text-base">
            Manage the category structure used across parts listings and marketplace navigation.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-900/50 bg-red-950/20 p-6 text-red-300 shadow-sm">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-3xl border border-green-900/50 bg-green-950/20 p-6 text-green-300 shadow-sm">
          {success}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm"
        >
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Create category</h2>
            <p className="mt-1 text-sm text-gray-400">
              Add a new category for admin moderation and seller listing organization.
            </p>
          </div>

          <div className="mt-6 grid gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">
                Category name
              </label>
              <input
                value={form.name}
                onChange={setField("name")}
                placeholder="Brake System"
                className="h-12 w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 text-sm text-gray-100 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">
                Slug
              </label>
              <input
                value={form.slug}
                onChange={setField("slug")}
                placeholder="brake-system"
                className="h-12 w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 text-sm text-gray-100 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">
                Parent category
              </label>
              <select
                value={form.parent_id}
                onChange={setField("parent_id")}
                className="h-12 w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 text-sm text-gray-100 outline-none"
              >
                <option value="">No parent</option>
                {sortedCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">
                Icon
              </label>
              <input
                value={form.icon}
                onChange={setField("icon")}
                placeholder="brake-disc"
                className="h-12 w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 text-sm text-gray-100 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create category"}
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-100">Categories list</h2>
              <p className="mt-1 text-sm text-gray-400">
                Current marketplace taxonomy used across product listings.
              </p>
            </div>

            <div className="rounded-2xl bg-gray-950 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-wide text-gray-500">Total</p>
              <p className="mt-1 text-xl font-bold text-gray-100">{categories.length}</p>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl bg-gray-950 p-4 text-sm text-gray-400">
              Loading categories...
            </div>
          ) : sortedCategories.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-gray-700 bg-gray-950 p-8 text-center text-sm text-gray-400">
              No categories found.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {sortedCategories.map((category) => {
                const parent = sortedCategories.find(
                  (item) => String(item.id) === String(category.parent_id)
                );

                return (
                  <div
                    key={category.id}
                    className="rounded-2xl border border-gray-800 bg-gray-950 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-100">{category.name}</p>
                        <p className="mt-1 text-sm text-gray-500">{category.slug || "—"}</p>
                      </div>

                      <div className="grid gap-2 text-xs text-gray-400 sm:text-right">
                        <p>ID: {category.id ?? "—"}</p>
                        <p>Parent: {parent?.name || "None"}</p>
                        <p>Icon: {category.icon || "—"}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
