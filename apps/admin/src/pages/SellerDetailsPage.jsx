import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { reasonPromptFor, useReasonDialog } from "../components/ReasonDialog";
import { formatMoney } from "@parthub/shared";
import { statusLabel, useT } from "../i18n";
import { notifyPendingChanged } from "../lib/pending";

function statusClasses(status) {
  switch (status) {
    case "active":
      return "bg-green-50 text-green-700 border-green-200";
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "rejected":
      return "bg-red-50 text-red-700 border-red-200";
    case "suspended":
      return "bg-gray-100 text-gray-700 border-gray-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export default function SellerDetailsPage() {
  const t = useT();
  const { id } = useParams();
  const navigate = useNavigate();

  const [seller, setSeller] = useState(null);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function loadSeller() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/api/v1/admin/sellers/${id}`);
      setSeller(response?.data || null);
      setParts(Array.isArray(response?.data?.parts) ? response.data.parts : []);
    } catch (err) {
      setError(err?.message || t("Failed to load seller details"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSeller();
  }, [id]);

  const { ask: askReason, dialog: reasonDialog } = useReasonDialog();

  async function updateStatus(status) {
    const prompt = reasonPromptFor("seller", status, seller?.name);
    let reason;
    if (prompt) {
      reason = await askReason(prompt);
      if (reason === null) return;
    }
    try {
      setWorking(true);
      setError("");
      await api.patch(`/api/v1/admin/sellers/${id}/status`, { status, reason });
      notifyPendingChanged();
      await loadSeller();
    } catch (err) {
      setError(err?.message || t("Failed to update seller status"));
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
        {t("Loading seller details...")}
      </div>
    );
  }

  if (error || !seller) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
        {error || t("Seller not found")}
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              {t("Seller details")}
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">{seller.name}</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              {t("Review seller trust, listing quality, and onboarding status.")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/sellers")}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              {t("Back to sellers")}
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
              onClick={() => updateStatus("suspended")}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-amber-500 px-5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
            >
              {t("Suspend")}
            </button>
            <button
              type="button"
              disabled={working}
              onClick={() => updateStatus("rejected")}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {t("Reject")}
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
                  statusClasses(seller.status),
                ].join(" ")}
              >
                {statusLabel(seller.status)}
              </span>
              {seller.moderation_note ? (
                <p className="basis-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <span className="font-semibold">{t("Message to seller:")}</span> {seller.moderation_note}
                </p>
              ) : null}
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                slug: {seller.slug}
              </span>
            </div>

            <div className="mt-5 space-y-4 text-sm text-gray-600">
              <p><span className="font-semibold text-gray-900">{t("Email:")}</span> {seller.user_email || t("Unknown")}</p>
              <p><span className="font-semibold text-gray-900">{t("Phone:")}</span> {seller.phone || seller.user_phone || t("Not provided")}</p>
              <p><span className="font-semibold text-gray-900">{t("WhatsApp:")}</span> {seller.whatsapp || t("Not provided")}</p>
              <p><span className="font-semibold text-gray-900">{t("Location:")}</span> {seller.location || t("Not provided")}</p>
              <p><span className="font-semibold text-gray-900">{t("Created at:")}</span> {seller.created_at || t("Unknown")}</p>
            </div>

            <div className="mt-5 rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">{t("Description")}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {seller.description || t("No seller description available.")}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">{t("Seller parts")}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {t("Review listings associated with this seller account.")}
            </p>

            {parts.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
                {t("No parts found for this seller.")}
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {parts.map((part) => (
                  <Link
                    key={part.id}
                    to={`/parts/${part.id}`}
                    className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-gray-900">{part.title}</p>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        {statusLabel(part.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      slug: {part.slug} • {t("price: {price}", { price: formatMoney(part.price) })}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <VerificationCard seller={seller} onChanged={loadSeller} />

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">{t("Moderation guidance")}</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <p>{t("• Approve sellers with complete identity and trustworthy listing quality.")}</p>
              <p>{t("• Suspend sellers when quality or response confidence is unclear.")}</p>
              <p>{t("• Reject weak onboarding when trust signals are too low.")}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">{t("Quick actions")}</h2>
            <div className="mt-4 grid gap-3">
              <button
                type="button"
                disabled={working}
                onClick={() => updateStatus("active")}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-green-600 px-5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                {t("Approve seller")}
              </button>
              <button
                type="button"
                disabled={working}
                onClick={() => updateStatus("suspended")}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-amber-500 px-5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
              >
                {t("Suspend seller")}
              </button>
              <button
                type="button"
                disabled={working}
                onClick={() => updateStatus("rejected")}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {t("Reject seller")}
              </button>
            </div>
          </div>
        </aside>
      </div>
      {reasonDialog}
    </section>
  );
}

// "Verified seller" badge (API: PUT /api/v1/admin/sellers/:id/verification).
// Given only after a real check; the note stays inside PartHub.
function VerificationCard({ seller, onChanged }) {
  const t = useT();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const verified = !!seller.verified_at;

  async function save(next) {
    try {
      setBusy(true);
      setMessage("");
      await api.put(`/api/v1/admin/sellers/${seller.id}/verification`, next ? { verified: true, note } : { verified: false });
      setNote("");
      await onChanged();
    } catch (err) {
      setMessage(err?.message || t("Could not save"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">{t("Verified seller")}</h2>
      {verified ? (
        <div className="mt-3 space-y-3 text-sm text-gray-600">
          <p className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-800">
            {t("Verified on {date}", { date: seller.verified_at })}
          </p>
          {seller.verification_note ? <p><span className="font-semibold text-gray-900">{t("Checked:")}</span> {seller.verification_note}</p> : null}
          <button type="button" disabled={busy} onClick={() => save(false)} className="inline-flex h-10 items-center rounded-2xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            {t("Remove the badge")}
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3 text-sm text-gray-600">
          <p>{t("Buyers see the badge on the store and its parts. Give it only after checking the trade register (RC / ICE) or visiting the shop.")}</p>
          <label htmlFor="verification-note" className="block font-semibold text-gray-900">{t("What did you check?")}</label>
          <textarea
            id="verification-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={t("e.g. RC 123456 and ICE checked, shop visited on 14/11")}
            className="w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
          <button type="button" disabled={busy || seller.status !== "active" || note.trim().length < 5} onClick={() => save(true)} className="inline-flex h-10 items-center rounded-2xl bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
            {t("Mark as verified")}
          </button>
          {seller.status !== "active" ? <p className="text-amber-700">{t("Approve the store first.")}</p> : null}
        </div>
      )}
      {message ? <p className="mt-3 text-sm text-red-700">{message}</p> : null}
    </div>
  );
}
