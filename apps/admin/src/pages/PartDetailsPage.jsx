import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { reasonPromptFor, useReasonDialog } from "../components/ReasonDialog";
import { formatMoney } from "@parthub/shared";
import { statusLabel, useT } from "../i18n";

function statusClasses(status) {
  switch (status) {
    case "active":
      return "bg-green-50 text-green-700 border-green-200";
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "rejected":
      return "bg-red-50 text-red-700 border-red-200";
    case "archived":
      return "bg-gray-100 text-gray-700 border-gray-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export default function PartDetailsPage() {
  const t = useT();
  const { id } = useParams();
  const navigate = useNavigate();

  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function loadPart() {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/api/v1/admin/parts/${id}`);
      setPart(response?.data || null);
    } catch (err) {
      setError(err?.message || t("Failed to load part details"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPart();
  }, [id]);

  const { ask: askReason, dialog: reasonDialog } = useReasonDialog();

  async function updateStatus(status) {
    const prompt = reasonPromptFor("part", status, part?.title);
    let reason;
    if (prompt) {
      reason = await askReason(prompt);
      if (reason === null) return;
    }
    try {
      setWorking(true);
      setError("");
      await api.patch(`/api/v1/admin/parts/${id}/status`, { status, reason });
      await loadPart();
    } catch (err) {
      setError(err?.message || t("Failed to update part status"));
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
        {t("Loading part details...")}
      </div>
    );
  }

  if (error || !part) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
        {error || t("Part not found")}
      </div>
    );
  }

  const images = Array.isArray(part.images) ? part.images : [];
  const compatibility = Array.isArray(part.compatibility) ? part.compatibility : [];
  const specs = Array.isArray(part.specs) ? part.specs : [];

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              {t("Part details")}
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">{part.title}</h1>
            <p className="mt-3 text-sm text-indigo-100 sm:text-base">
              {t("Review listing quality, fitment depth, and approval readiness.")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/parts")}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              {t("Back to parts")}
            </button>
            <button
              type="button"
              disabled={working}
              onClick={() => updateStatus("active")}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-green-600 px-5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
            >
              {t("Approve")}
            </button>
            <button
              type="button"
              disabled={working}
              onClick={() => updateStatus("rejected")}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {t("Reject")}
            </button>
            <button
              type="button"
              disabled={working}
              onClick={() => updateStatus("archived")}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-gray-700 px-5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
            >
              {t("Archive")}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={[
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  statusClasses(part.status),
                ].join(" ")}
              >
                {statusLabel(part.status)}
              </span>
              {part.moderation_note ? (
                <p className="basis-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <span className="font-semibold">{t("Message to seller:")}</span> {part.moderation_note}
                </p>
              ) : null}
              {part.condition ? (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {statusLabel(part.condition)}
                </span>
              ) : null}
            </div>

            <div className="mt-5 space-y-4 text-sm text-gray-600">
              <p><span className="font-semibold text-gray-900">{t("Slug:")}</span> {part.slug}</p>
              <p><span className="font-semibold text-gray-900">{t("SKU:")}</span> {part.sku || t("Not provided")}</p>
              <p><span className="font-semibold text-gray-900">{t("Seller:")}</span> {part.seller_name || t("Unknown")}</p>
              <p><span className="font-semibold text-gray-900">{t("Brand:")}</span> {part.brand_name || t("Unknown")}</p>
              <p><span className="font-semibold text-gray-900">{t("Category:")}</span> {part.category_name || t("Unknown")}</p>
              <p><span className="font-semibold text-gray-900">{t("Price:")}</span> {formatMoney(part.price)}</p>
              <p><span className="font-semibold text-gray-900">{t("Quantity:")}</span> {part.quantity}</p>
            </div>

            <div className="mt-5 rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">{t("Description")}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {part.description || t("No description available.")}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">{t("Media")}</h2>
            {images.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
                {t("No media found for this part.")}
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {images.map((image) => (
                  <div key={image.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                    {image.url ? (
                      <img src={image.url} alt={image.alt_text || part.title} className="h-52 w-full object-cover" />
                    ) : null}
                    <div className="p-4 text-xs text-gray-500">
                      {t("featured: {value}", { value: Number(image.is_featured) ? t("yes") : t("no") })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">{t("Compatibility")}</h2>
            {compatibility.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
                {t("No compatibility rows found.")}
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {compatibility.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="font-semibold text-gray-900">
                      {row.make} • {row.model}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {row.year_start}
                      {row.year_end ? ` → ${row.year_end}` : ""}
                      {row.engine ? ` • ${row.engine}` : ""}
                      {row.trim ? ` • ${row.trim}` : ""}
                    </p>
                    {row.notes ? (
                      <p className="mt-2 text-sm text-gray-500">{row.notes}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">{t("Specifications")}</h2>
            {specs.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
                {t("No specifications available.")}
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {specs.map((spec) => (
                  <div key={spec.id} className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">{spec.label}</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{spec.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">{t("Moderation guidance")}</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <p>{t("• Approve listings with strong data quality and believable fitment information.")}</p>
              <p>{t("• Reject parts with weak, incomplete, or suspicious marketplace signals.")}</p>
              <p>{t("• Archive listings that should no longer appear in the active marketplace.")}</p>
            </div>
          </div>

          {part.seller_id ? (
            <Link
              to={`/sellers/${part.seller_id}`}
              className="block rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <h2 className="text-xl font-bold text-gray-900">{t("View seller profile")}</h2>
              <p className="mt-2 text-sm text-gray-600">
                {t("Open the seller details page to review broader trust context.")}
              </p>
              <p className="mt-4 text-sm font-semibold text-blue-700">{t("Open seller details")}</p>
            </Link>
          ) : null}
        </aside>
      </div>
      {reasonDialog}
    </section>
  );
}
