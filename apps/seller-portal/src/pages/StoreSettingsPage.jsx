import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function computeCompletion(form) {
  const checks = [
    Boolean(form.display_name?.trim()),
    Boolean(form.slug?.trim()),
    Boolean(form.phone?.trim()),
    Boolean(form.city?.trim()),
    Boolean(form.description?.trim()),
  ];

  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

export default function StoreSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    display_name: "",
    slug: "",
    phone: "",
    city: "",
    description: "",
    logo_url: "",
    banner_url: "",
  });

  useEffect(() => {
    let active = true;

    async function loadStore() {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/api/v1/marketplace/me");

        if (!active) return;

        const seller = res?.data || {};
        setForm({
          display_name: seller.display_name || "",
          slug: seller.slug || "",
          phone: seller.phone || "",
          city: seller.city || "",
          description: seller.description || "",
          logo_url: seller.logo_url || "",
          banner_url: seller.banner_url || "",
        });
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load store settings");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadStore();

    return () => {
      active = false;
    };
  }, []);

  const completion = useMemo(() => computeCompletion(form), [form]);

  const storeStatus = useMemo(() => {
    if (completion >= 100) return "Ready";
    if (completion >= 60) return "Almost ready";
    return "Needs setup";
  }, [completion]);

  function setField(key) {
    return (e) => {
      setError("");
      setSuccess("");
      const value = e.target.value;

      setForm((prev) => {
        if (key === "display_name" && !prev.slug) {
          return {
            ...prev,
            display_name: value,
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

    if (!form.display_name.trim()) {
      setError("Store display name is required.");
      return;
    }

    if (!form.slug.trim()) {
      setError("Store slug is required.");
      return;
    }

    if (!form.city.trim()) {
      setError("City is required.");
      return;
    }

    try {
      setSaving(true);

      await api.put("/api/v1/marketplace/onboarding", {
        display_name: form.display_name.trim(),
        slug: form.slug.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        description: form.description.trim(),
        logo_url: form.logo_url.trim(),
        banner_url: form.banner_url.trim(),
      });

      setSuccess("Store settings saved successfully.");
    } catch (err) {
      setError(err?.message || "Failed to save store settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading store settings...
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
              Store settings
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">Manage your seller profile</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              Complete your store identity so your listings and seller presence look stronger.
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-white/70">Store readiness</p>
            <p className="mt-1 text-3xl font-bold">{completion}%</p>
            <p className="mt-1 text-sm text-blue-100">{storeStatus}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Store profile</h2>
            <p className="mt-1 text-sm text-gray-500">
              These details define how your seller presence appears across the marketplace.
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
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Store display name
              </label>
              <input
                value={form.display_name}
                onChange={setField("display_name")}
                placeholder="PartHub Motors"
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Store slug
              </label>
              <input
                value={form.slug}
                onChange={setField("slug")}
                placeholder="parthub-motors"
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                value={form.phone}
                onChange={setField("phone")}
                placeholder="+44 ..."
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                value={form.city}
                onChange={setField("city")}
                placeholder="London"
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
                placeholder="Tell buyers about your store, specialties, and trust signals..."
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Logo URL
              </label>
              <input
                value={form.logo_url}
                onChange={setField("logo_url")}
                placeholder="https://..."
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Banner URL
              </label>
              <input
                value={form.banner_url}
                onChange={setField("banner_url")}
                placeholder="https://..."
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {saving ? "Saving..." : "Save store settings"}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Store status</h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Completion</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{completion}%</p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Status</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{storeStatus}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Preview snapshot</h2>

            <div className="mt-5 overflow-hidden rounded-3xl border border-gray-200 bg-white">
              <div className="h-28 bg-gray-100">
                {form.banner_url ? (
                  <img src={form.banner_url} alt="Store banner" className="h-full w-full object-cover" />
                ) : null}
              </div>

              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-2xl bg-gray-100">
                    {form.logo_url ? (
                      <img src={form.logo_url} alt="Store logo" className="h-full w-full object-cover" />
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-bold text-gray-900">
                      {form.display_name || "Your store name"}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      /{form.slug || "your-store-slug"}
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      {form.city || "City not set"}{form.phone ? ` • ${form.phone}` : ""}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-gray-600">
                  {form.description || "Your store description preview will appear here."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">What helps most</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="rounded-2xl bg-gray-50 p-4">
                A clear store name and description improve seller credibility.
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                City and phone make your seller profile feel more complete.
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                Logo and banner URLs help your store look more professional.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
