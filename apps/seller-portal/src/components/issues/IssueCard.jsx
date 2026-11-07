import { useState } from "react";
import { Link } from "react-router-dom";
import { formatMoney, issueReasonLabel } from "@parthub/shared";
import { api } from "../../lib/api";
import { dateLocale, useT } from "../../i18n";

// A buyer's claim on one of the seller's parts, with the seller's actions:
// accept or refuse (open), then "Refund done" (accepted).

const STATUS = {
  open: { label: "Waiting for your reply", tone: "bg-amber-50 text-amber-800" },
  accepted: { label: "Accepted: refund to do", tone: "bg-blue-50 text-blue-700" },
  refused: { label: "Refused", tone: "bg-gray-100 text-gray-700" },
  escalated: { label: "PartHub is reviewing", tone: "bg-purple-50 text-purple-700" },
  closed: { label: "Closed", tone: "bg-gray-100 text-gray-600" },
};

function when(value) {
  const d = new Date(`${String(value || "").replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(dateLocale(), { day: "numeric", month: "short" });
}

export default function IssueCard({ issue, onChange, showOrder = false }) {
  const t = useT();
  const [mode, setMode] = useState("");
  const [note, setNote] = useState("");
  const [refund, setRefund] = useState(""); // MAD, empty = the whole line
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const status = STATUS[issue.status] || STATUS.closed;

  async function send(path, body) {
    setBusy(true);
    setError("");
    try {
      const res = await api.post(`/api/v1/marketplace/me/issues/${issue.id}/${path}`, body);
      setMode("");
      setNote("");
      setRefund("");
      onChange?.(res?.data);
    } catch (err) {
      setError(err?.message || t("Something went wrong. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    if (mode === "refuse" && !note.trim()) return setError(t("Explain to the buyer why you refuse"));
    if (mode === "resolve") return send("resolve", { note: note.trim(), refund_amount: refund.trim() });
    return send("respond", { decision: mode, note: note.trim() });
  }

  const outcome =
    issue.outcome === "buyer" ? t("Refunded") : issue.outcome === "seller" ? t("PartHub decided for you") : issue.outcome === "withdrawn" ? t("Withdrawn by the buyer") : "";

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">{t(issueReasonLabel(issue.reason))}</p>
          <p className="text-xs text-gray-500">
            {issue.part_title ? `${issue.part_title} · ` : ""}
            {issue.buyer_name ? `${issue.buyer_name} · ` : ""}
            {t("reported on {date}", { date: when(issue.created_at) })}
            {showOrder && issue.reference ? (
              <>
                {" · "}
                <Link to={`/orders/${issue.order_id}`} className="font-semibold text-blue-700 hover:underline">{issue.reference}</Link>
              </>
            ) : null}
          </p>
        </div>
        <span className={["rounded-full px-3 py-1 text-xs font-semibold", status.tone].join(" ")}>
          {t(status.label)}{outcome ? ` · ${outcome}` : ""}
        </span>
      </div>

      <p className="mt-3 whitespace-pre-line rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-800">{issue.details}</p>
      {issue.seller_note ? (
        <p className="mt-2 text-sm text-gray-700"><span className="font-semibold">{t("Your reply:")}</span> {issue.seller_note}</p>
      ) : null}
      {issue.admin_note ? (
        <p className="mt-2 text-sm text-gray-700"><span className="font-semibold">PartHub:</span> {issue.admin_note}</p>
      ) : null}
      {issue.status !== "closed" && issue.return_paid_by ? (
        <p className="mt-2 text-xs text-gray-500">
          {issue.return_paid_by === "seller" ? t("Under the returns policy, you pay for the return.") : t("Under the returns policy, the buyer pays for the return.")}
          {issue.subtotal ? ` ${t("Amount: {price}", { price: formatMoney(issue.subtotal) })}` : ""}
        </p>
      ) : null}
      {issue.status === "open" ? <p className="mt-2 text-xs font-semibold text-amber-700">{t("Reply within 2 working days, or the buyer can ask PartHub to decide.")}</p> : null}

      {issue.status === "open" || issue.status === "accepted" ? (
        <div className="mt-3">
          {!mode ? (
            <div className="flex flex-wrap gap-2">
              {issue.status === "open" ? (
                <>
                  <button type="button" onClick={() => setMode("accept")} className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">
                    {t("Accept the return")}
                  </button>
                  <button type="button" onClick={() => setMode("refuse")} className="h-10 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                    {t("Refuse")}
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setMode("resolve")} className="h-10 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700">
                  {t("Refund done")}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <label htmlFor={`issue-note-${issue.id}`} className="block text-sm font-semibold text-gray-900">
                {mode === "accept"
                  ? t("How should the buyer send the part back? (optional)")
                  : mode === "refuse"
                    ? t("Why do you refuse? The buyer and PartHub see this.")
                    : t("How did you refund the buyer? (optional)")}
              </label>
              {mode === "resolve" ? (
                <div>
                  <label htmlFor={`issue-refund-${issue.id}`} className="block text-sm font-semibold text-gray-900">
                    {t("Amount refunded (MAD)")}
                  </label>
                  <input
                    id={`issue-refund-${issue.id}`}
                    inputMode="decimal"
                    value={refund}
                    onChange={(e) => setRefund(e.target.value)}
                    placeholder={issue.subtotal ? String(issue.subtotal / 100) : ""}
                    className="mt-1 h-10 w-36 rounded-xl border border-gray-200 bg-white px-3 font-mono text-sm outline-none focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">{t("Leave empty if you refunded the whole line. For a partial return (1 part of 3), enter what you gave back: commission applies only to what the buyer kept.")}</p>
                </div>
              ) : null}
              <textarea
                id={`issue-note-${issue.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={1000}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={submit} disabled={busy} className="h-9 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300">
                  {busy ? t("Saving…") : t("Send")}
                </button>
                <button type="button" onClick={() => (setMode(""), setError(""))} className="h-9 rounded-xl px-3 text-sm font-semibold text-gray-600 hover:bg-gray-100">
                  {t("Cancel")}
                </button>
              </div>
            </div>
          )}
          {error ? <p className="mt-2 text-sm text-red-700" role="alert">{error}</p> : null}
        </div>
      ) : null}
    </article>
  );
}
