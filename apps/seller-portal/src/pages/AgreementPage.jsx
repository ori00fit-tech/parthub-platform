import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { legalDoc } from "@parthub/shared/legal";
import { api } from "../lib/api";
import { useReadiness } from "../lib/readiness";
import { useI18n } from "../i18n";
import LegalDocument, { legalVersionDate } from "../components/legal/LegalDocument";

// The seller agreement, with an accept button for stores opened before it
// existed (POST /api/v1/marketplace/me/agreement).
export default function AgreementPage() {
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const { readiness, loading, reload } = useReadiness();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const doc = legalDoc("seller", lang);
  const hasStore = Boolean(readiness?.seller);
  const accepted = Boolean(readiness?.items?.find((i) => i.id === "agreement")?.done);

  async function accept() {
    if (!checked) return setError(t("Tick the box to accept the seller agreement."));
    setSaving(true);
    setError("");
    try {
      await api.post("/api/v1/marketplace/me/agreement", {});
      await reload();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err?.message || t("Something went wrong. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold text-gray-900">{doc.title}</h1>
        <p className="mt-2 text-sm text-gray-500">{doc.summary}</p>
        <p className="mt-1 text-xs text-gray-400">{t("Version of {date}", { date: legalVersionDate() })}</p>
        <div className="mt-8">
          <LegalDocument doc={doc} />
        </div>
        <p className="mt-6 text-sm text-gray-500">
          <Link to="/legal/returns" target="_blank" rel="noopener" className="font-semibold text-blue-700 hover:underline">
            {legalDoc("returns", lang).title}
          </Link>
          {" · "}
          <Link to="/legal/terms" target="_blank" rel="noopener" className="font-semibold text-blue-700 hover:underline">
            {legalDoc("terms", lang).title}
          </Link>
        </p>
      </article>

      {loading ? null : accepted ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">
          {t("You accepted this agreement.")}
        </p>
      ) : hasStore ? (
        <div className="sticky bottom-4 rounded-3xl border border-blue-200 bg-white p-5 shadow-lg">
          <label className="flex items-start gap-3 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-5 w-5 flex-none rounded border-gray-300 text-blue-600"
            />
            <span>{t("I have read and accept the seller agreement and the returns policy.")}</span>
          </label>
          {error ? <p className="mt-3 text-sm text-red-700" role="alert">{error}</p> : null}
          <button
            type="button"
            onClick={accept}
            disabled={saving}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
          >
            {saving ? t("Saving…") : t("Accept the agreement")}
          </button>
        </div>
      ) : (
        <p className="rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-700">
          {t("You accept this agreement when you create your store.")}{" "}
          <Link to="/store-settings" className="font-semibold text-blue-700 hover:underline">{t("Create store")}</Link>
        </p>
      )}
    </section>
  );
}
