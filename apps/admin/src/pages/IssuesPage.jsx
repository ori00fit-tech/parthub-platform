import { useCallback, useEffect, useState } from "react";
import { formatMoney, issueReasonLabel } from "@parthub/shared";
import { api } from "../lib/api";
import { dateLocale, useT } from "../i18n";
import { notifyPendingChanged } from "../lib/pending";

// Returns and complaints. A buyer escalates when the seller refuses, does
// not reply in time, or does not refund; PartHub decides and the decision
// is recorded on the order (visible to the buyer and the seller).

const FILTERS = [
  { id: "escalated", label: "To decide" },
  { id: "active", label: "In progress" },
  { id: "all", label: "All" },
];

const STATUS_LABEL = {
  open: "Waiting for the seller",
  accepted: "Accepted, refund to do",
  refused: "Refused by the seller",
  escalated: "To decide",
  closed: "Closed",
};

function when(value) {
  const d = new Date(`${String(value || "").replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(dateLocale(), { day: "numeric", month: "short", year: "numeric" });
}

function DecisionForm({ issue, onDone }) {
  const t = useT();
  const [outcome, setOutcome] = useState("");
  const [paidBy, setPaidBy] = useState(issue.return_paid_by || "seller");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!outcome) return setError(t("Choose who the decision favours"));
    if (!note.trim()) return setError(t("Write the reason for the decision"));
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/v1/admin/issues/${issue.id}/decide`, {
        outcome,
        note: note.trim(),
        ...(outcome === "buyer" ? { return_paid_by: paidBy } : {}),
      });
      notifyPendingChanged();
      onDone?.();
    } catch (err) {
      setError(err?.message || t("Something went wrong. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-gray-800">
      <p className="text-sm font-semibold text-gray-900">{t("PartHub decision")}</p>
      <div className="flex flex-wrap gap-2">
        {[
          ["buyer", "For the buyer: return and refund"],
          ["seller", "For the seller: claim rejected"],
        ].map(([id, label]) => (
          <label key={id} className={["flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm", outcome === id ? "border-blue-500 bg-white" : "border-gray-200 bg-white"].join(" ")}>
            <input type="radio" name={`outcome-${issue.id}`} checked={outcome === id} onChange={() => setOutcome(id)} />
            {t(label)}
          </label>
        ))}
      </div>
      {outcome === "buyer" ? (
        <label className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
          {t("Return shipping paid by")}
          <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-1">
            <option value="seller">{t("Seller")}</option>
            <option value="buyer">{t("Buyer")}</option>
          </select>
        </label>
      ) : null}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder={t("Reason for the decision (shown to the buyer and the seller)")}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
      {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
      <button type="button" onClick={submit} disabled={busy} className="h-10 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300">
        {busy ? t("Saving…") : t("Record the decision")}
      </button>
    </div>
  );
}

export default function IssuesPage() {
  const t = useT();
  const [filter, setFilter] = useState("escalated");
  const [state, setState] = useState({ loading: true, error: "", rows: [] });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    return api
      .get(`/api/v1/admin/issues?status=${filter}&limit=50`)
      .then((res) => setState({ loading: false, error: "", rows: Array.isArray(res?.data) ? res.data : [] }))
      .catch((err) => setState({ loading: false, error: err?.message || t("Something went wrong. Please try again."), rows: [] }));
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-amber-700 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">{t("Returns and claims")}</h1>
        <p className="mt-3 text-sm text-amber-100 sm:text-base">{t("Claims the buyer asked PartHub to decide, after the seller refused or did not reply.")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={["rounded-xl px-4 py-2 text-sm font-semibold", filter === f.id ? "bg-blue-600 text-white" : "border border-gray-200 bg-white text-gray-700"].join(" ")}
          >
            {t(f.label)}
          </button>
        ))}
      </div>

      {state.error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p> : null}
      {state.loading ? <div className="h-32 animate-pulse rounded-3xl bg-gray-900" /> : null}
      {!state.loading && !state.rows.length && !state.error ? (
        <p className="rounded-3xl border border-dashed border-gray-700 bg-gray-900 px-6 py-10 text-center text-sm text-gray-400">{t("Nothing to decide.")}</p>
      ) : null}

      <div className="space-y-4">
        {state.rows.map((issue) => (
          <article key={issue.id} className="rounded-3xl border border-gray-200 bg-white p-5 text-gray-900 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-lg font-bold text-gray-900">{t(issueReasonLabel(issue.reason))}</p>
                <p className="text-sm text-gray-500">
                  <span className="font-mono">{issue.reference}</span> · {issue.part_title} · {formatMoney(issue.subtotal)}
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{t(STATUS_LABEL[issue.status] || issue.status)}</span>
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-3">
                <dt className="text-xs uppercase tracking-wide text-gray-400">{t("Buyer")}</dt>
                <dd className="font-semibold text-gray-900">{issue.buyer_name}</dd>
                <dd className="text-gray-600">{issue.buyer_email}{issue.buyer_phone ? ` · ${issue.buyer_phone}` : ""}</dd>
              </div>
              <div className="rounded-2xl bg-gray-50 p-3">
                <dt className="text-xs uppercase tracking-wide text-gray-400">{t("Seller")}</dt>
                <dd className="font-semibold text-gray-900">{issue.seller_name}</dd>
                <dd className="text-gray-600">{issue.seller_whatsapp || issue.seller_phone || "—"}</dd>
              </div>
            </dl>

            <div className="mt-4 space-y-2 text-sm">
              <p className="text-xs text-gray-500">
                {t("Delivered {date}", { date: when(issue.delivered_at) })} · {t("Reported {date}", { date: when(issue.created_at) })}
                {issue.escalated_at ? ` · ${t("Sent to PartHub {date}", { date: when(issue.escalated_at) })}` : ""}
              </p>
              <p className="whitespace-pre-line rounded-xl bg-amber-50 px-3 py-2 text-gray-800"><span className="font-semibold">{t("Buyer:")}</span> {issue.details}</p>
              {issue.seller_note ? (
                <p className="whitespace-pre-line rounded-xl bg-gray-50 px-3 py-2 text-gray-800"><span className="font-semibold">{t("Seller:")}</span> {issue.seller_note}</p>
              ) : issue.status === "escalated" ? (
                <p className="text-gray-500">{t("The seller did not reply.")}</p>
              ) : null}
              {issue.admin_note ? <p className="rounded-xl bg-blue-50 px-3 py-2 text-gray-800"><span className="font-semibold">PartHub:</span> {issue.admin_note}</p> : null}
              {issue.return_paid_by ? (
                <p className="text-xs text-gray-500">
                  {issue.return_paid_by === "seller" ? t("Policy: the seller pays the return for this reason.") : t("Policy: the buyer pays the return for this reason.")}
                </p>
              ) : null}
            </div>

            {issue.status !== "closed" ? <DecisionForm issue={issue} onDone={load} /> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
