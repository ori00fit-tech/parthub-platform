import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { STATUS_COPY, useReadiness } from "../lib/readiness";
import { mediaUrl } from "../lib/requests";
import StoreChecklist, { StoreStatusBanner } from "../components/store/StoreChecklist";
import { useT } from "../i18n";
import ChangePasswordForm from "@parthub/shared/account";
import { LinkedText } from "../components/legal/LegalDocument";
import FulfillmentSettings from "../components/store/FulfillmentSettings";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function StoreSettingsPage() {
  const t = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, setSessionToken } = useAuth();
  const { readiness, loading: readinessLoading, error: readinessError, reload: reloadReadiness } = useReadiness();
  const hasStore = Boolean(readiness?.seller);
  const isWelcome = searchParams.get("welcome") === "1";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [acceptAgreement, setAcceptAgreement] = useState(false);

  const [form, setForm] = useState({
    display_name: "",
    slug: "",
    phone: "",
    whatsapp: "",
    city: "",
    description: "",
    logo_url: "",
    banner_url: "",
  });

  useEffect(() => {
    if (readinessLoading) return undefined;
    // No store yet: start from the account's details.
    if (!hasStore) {
      setForm((prev) => ({ ...prev, phone: prev.phone || user?.phone || "" }));
      setLoading(false);
      return undefined;
    }
    let active = true;

    async function loadStore() {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("/api/v1/marketplace/me");
        if (!active) return;

        const seller = res?.data || {};

        setForm({
          display_name: seller.display_name || seller.name || "",
          slug: seller.slug || "",
          phone: seller.phone || "",
          whatsapp: seller.whatsapp || "",
          city: seller.city || seller.location || "",
          description: seller.description || "",
          logo_url: seller.logo_url || "",
          banner_url: seller.banner_url || "",
        });
      } catch (err) {
        if (!active) return;
        setError(err?.message || t("Failed to load store settings"));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadStore();

    return () => {
      active = false;
    };
  }, [readinessLoading, hasStore]); // eslint-disable-line react-hooks/exhaustive-deps

  const completion = readiness?.percent ?? 0;
  const storeStatus = t((STATUS_COPY[readiness?.status] || STATUS_COPY.setup).title);

  function setField(key) {
    return (e) => {
      setError("");
      setSuccess("");
      const value =
        key === "slug"
          ? e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+/, "")
          : e.target.value;

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
      setError(t("Store display name is required."));
      return;
    }

    if (!form.slug.trim()) {
      setError(t("Store slug is required."));
      return;
    }

    if (!form.city.trim()) {
      setError(t("City is required."));
      return;
    }

    if (!hasStore && !acceptAgreement) {
      setError(t("Tick the box to accept the seller agreement."));
      return;
    }

    try {
      setSaving(true);

      const payload = {
        display_name: form.display_name.trim(),
        slug: form.slug.trim().replace(/-+$/, ""),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        city: form.city.trim(),
        description: form.description.trim(),
        logo_url: form.logo_url.trim(),
        banner_url: form.banner_url.trim(),
        ...(hasStore ? {} : { accept_agreement: acceptAgreement }),
      };

      if (hasStore) {
        await api.put("/api/v1/marketplace/onboarding", payload);
        setSuccess(t("Store settings saved."));
      } else {
        const res = await api.post("/api/v1/marketplace/onboarding", payload);
        // The new token carries the seller id, so the rest of the portal works right away.
        setSessionToken(res?.data?.access_token);
        setSuccess(t("Store created. PartHub will review it; meanwhile you can add your first parts."));
        if (isWelcome) navigate("/store-settings", { replace: true });
      }
      await reloadReadiness();
    } catch (err) {
      setError(err?.message || t("Failed to save store settings"));
    } finally {
      setSaving(false);
    }
  }

  if (loading || readinessLoading) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
          {t("Loading store settings...")}
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
              {t("Store settings")}
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">{hasStore ? t("Manage your seller profile") : t("Create your store")}</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              {hasStore
                ? t("Complete your store identity so your listings and seller presence look stronger.")
                : t("Name, web address and city are enough to start. You can add the rest later.")}
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-white/70">{t("Store readiness")}</p>
            <p className="mt-1 text-3xl font-bold">{completion}%</p>
            <p className="mt-1 text-sm text-blue-100">{storeStatus}</p>
          </div>
        </div>
      </div>

      {hasStore ? <StoreStatusBanner readiness={readiness} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t("Store profile")}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {t("These details define how your seller presence appears across the marketplace.")}
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
                {t("Store display name")}
              </label>
              <input
                value={form.display_name}
                onChange={setField("display_name")}
                placeholder={t("Casse Hay Hassani")}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("Store web address")}
              </label>
              <input
                value={form.slug}
                onChange={setField("slug")}
                placeholder="casse-hay-hassani"
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("Phone")}
              </label>
              <input
                value={form.phone}
                onChange={setField("phone")}
                inputMode="tel"
                placeholder="06 12 34 56 78"
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("WhatsApp")}
              </label>
              <input
                value={form.whatsapp}
                onChange={setField("whatsapp")}
                inputMode="tel"
                placeholder="2126 12 34 56 78"
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("City")}
              </label>
              <input
                value={form.city}
                onChange={setField("city")}
                placeholder={t("Casablanca")}
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("Description")}
              </label>
              <textarea
                rows={5}
                value={form.description}
                onChange={setField("description")}
                placeholder={t("Tell buyers about your store, specialties, and trust signals...")}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("Logo URL")}
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
                {t("Banner URL")}
              </label>
              <input
                value={form.banner_url}
                onChange={setField("banner_url")}
                placeholder="https://..."
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {!hasStore ? (
            <label className="mt-6 flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={acceptAgreement}
                onChange={(e) => setAcceptAgreement(e.target.checked)}
                className="mt-0.5 h-5 w-5 flex-none rounded border-gray-300 text-blue-600"
              />
              <span>
                <LinkedText
                  text={t("I accept the [Seller agreement] and the [Returns policy].")}
                  links={["/legal/seller", "/legal/returns"]}
                />
              </span>
            </label>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {saving ? t("Saving…") : hasStore ? t("Save store settings") : t("Create store")}
            </button>
          </div>
        </form>
        {hasStore ? <FulfillmentSettings /> : null}
        </div>

        <div className="space-y-4">
          <StoreChecklist
            readiness={readiness}
            loading={readinessLoading}
            error={readinessError}
            onRetry={reloadReadiness}
          />

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">{t("Preview snapshot")}</h2>

            <div className="mt-5 overflow-hidden rounded-3xl border border-gray-200 bg-white">
              <div className="h-28 bg-gray-100">
                {form.banner_url ? (
                  <img src={mediaUrl(form.banner_url)} alt={t("Store banner")} className="h-full w-full object-cover" />
                ) : null}
              </div>

              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-2xl bg-gray-100">
                    {form.logo_url ? (
                      <img src={mediaUrl(form.logo_url)} alt={t("Store logo")} className="h-full w-full object-cover" />
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-bold text-gray-900">
                      {form.display_name || t("Your store name")}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      /{form.slug || "your-store-slug"}
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      {form.city || t("City not set")}{form.phone ? ` • ${form.phone}` : ""}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-gray-600">
                  {form.description || t("Your store description preview will appear here.")}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">{t("What helps most")}</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="rounded-2xl bg-gray-50 p-4">
                {t("A clear store name and description improve seller credibility.")}
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                {t("City and phone make your seller profile feel more complete.")}
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                {t("Logo and banner URLs help your store look more professional.")}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">{t("Password")}</h2>
        <div className="mt-3">
          <ChangePasswordForm
            t={t}
            submit={(current, next) => api.post("/api/v1/auth/password", { current_password: current, new_password: next }).then((r) => r?.data)}
            onToken={setSessionToken}
          />
        </div>
      </div>
      <p className="text-center text-sm">
        <Link to="/delete-account" className="font-semibold text-red-700 hover:underline">{t("Delete my account")}</Link>
      </p>
    </section>
  );
}
