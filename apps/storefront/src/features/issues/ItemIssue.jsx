import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@parthub/shared/icons";
import { ISSUE_REASONS, issueReasonLabel } from "@parthub/shared";
import { apiPost } from "../../lib/api";
import { dateLocale, useT } from "../../i18n";

// "Problem with this part?" under a delivered order line: report a problem
// (returns policy: 7 days after delivery), then follow the claim.


const PAYS_TEXT = {
  seller: "The seller pays for the return.",
  buyer: "You pay for the return shipping.",
  null: "If you and the seller disagree, PartHub decides who pays.",
};

function shortDate(value) {
  const d = new Date(`${String(value || "").replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(dateLocale(), { day: "numeric", month: "long" });
}

function reasonLabel(t, id) {
  return t(issueReasonLabel(id));
}

function IssueStatus({ issue, onChange }) {
  const t = useT();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function act(action) {
    if (action === "withdraw" && !window.confirm(t("Withdraw this claim?"))) return;
    setBusy(action);
    setError("");
    try {
      await apiPost(`/api/v1/commerce/issues/${issue.id}/${action}`, {}, { auth: true });
      await onChange?.();
    } catch (err) {
      setError(err?.message || t("Something went wrong. Please try again."));
    } finally {
      setBusy("");
    }
  }

  let tone = "border-amber-400/40 bg-amber-400/10";
  let title = t("Claim sent to the seller");
  let text = t("The seller replies within 2 working days.");
  if (issue.status === "accepted") {
    tone = "border-emerald-400/40 bg-emerald-400/10";
    title = issue.admin_note ? t("PartHub decided in your favour") : t("The seller accepted your claim");
    text = t("Agree with the seller how to send the part back. They refund you within 7 days of receiving it.");
  } else if (issue.status === "refused") {
    tone = "border-red-400/30 bg-red-400/10";
    title = t("The seller refused your claim");
    text = t("If you disagree, PartHub can review the case.");
  } else if (issue.status === "escalated") {
    title = t("PartHub is reviewing your claim");
    text = t("We look at the order with you and the seller, then record the decision here.");
  } else if (issue.status === "closed") {
    tone = "border-line bg-surface-2";
    title =
      issue.outcome === "buyer"
        ? t("Claim closed: refunded")
        : issue.outcome === "seller"
          ? t("Claim closed: PartHub decided for the seller")
          : t("You withdrew this claim");
    text = "";
  }

  return (
    <div className={["mt-2 rounded-2xl border p-3 text-sm", tone].join(" ")} role="status">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-0.5 text-xs text-muted">
        {reasonLabel(t, issue.reason)} · {t("reported on {date}", { date: shortDate(issue.created_at) })}
      </p>
      {text ? <p className="mt-1 text-ink-2">{text}</p> : null}
      {issue.seller_note ? (
        <p className="mt-2 rounded-xl bg-surface px-3 py-2 text-ink-2">
          <span className="font-semibold">{t("Seller:")}</span> {issue.seller_note}
        </p>
      ) : null}
      {issue.admin_note ? (
        <p className="mt-2 rounded-xl bg-surface px-3 py-2 text-ink-2">
          <span className="font-semibold">PartHub:</span> {issue.admin_note}
        </p>
      ) : null}
      {issue.status !== "closed" && issue.return_paid_by ? (
        <p className="mt-2 text-xs text-muted">{t(PAYS_TEXT[issue.return_paid_by])}</p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-700" role="alert">{error}</p> : null}
      {issue.can_escalate || issue.can_withdraw ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {issue.can_escalate ? (
            <button type="button" onClick={() => act("escalate")} disabled={Boolean(busy)} className="btn-cta h-9 rounded-xl px-4 text-xs">
              {busy === "escalate"
                ? t("Sending…")
                : issue.status === "open"
                  ? t("No reply from the seller? Ask PartHub")
                  : t("Ask PartHub to decide")}
            </button>
          ) : null}
          {issue.can_withdraw ? (
            <button type="button" onClick={() => act("withdraw")} disabled={Boolean(busy)} className="h-9 rounded-xl px-3 text-xs font-semibold text-muted hover:bg-surface-3">
              {t("Withdraw the claim")}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function IssueForm({ reference, item, onDone, onCancel }) {
  const t = useT();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const chosen = ISSUE_REASONS.find((r) => r.id === reason);

  async function submit(e) {
    e.preventDefault();
    if (!reason) return setError(t("Choose what the problem is"));
    if (details.trim().length < 10) return setError(t("Describe the problem in a few words (at least 10 characters)"));
    setSaving(true);
    setError("");
    try {
      await apiPost(
        `/api/v1/commerce/orders/${encodeURIComponent(reference)}/issues`,
        { order_item_id: item.id, reason, details: details.trim() },
        { auth: true }
      );
      await onDone?.();
    } catch (err) {
      setError(err?.message || t("Something went wrong. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-2xl border border-line bg-surface-2 p-4">
      <fieldset>
        <legend className="text-sm font-semibold text-ink">{t("What is the problem?")}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {ISSUE_REASONS.map((r) => (
            <label
              key={r.id}
              className={[
                "flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm",
                reason === r.id ? "border-sky-400 bg-surface text-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong",
              ].join(" ")}
            >
              <input type="radio" name={`reason-${item.id}`} value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} className="mt-0.5" />
              <span>{t(r.label)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {chosen ? <p className="text-xs font-semibold text-ink-2">{t(PAYS_TEXT[chosen.pays])}</p> : null}
      <div>
        <label htmlFor={`issue-details-${item.id}`} className="text-sm font-semibold text-ink">
          {t("Details for the seller")}
        </label>
        <textarea
          id={`issue-details-${item.id}`}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder={t("What happened? Your vehicle, what you noticed… You can send photos to the seller on WhatsApp.")}
          className="mt-1 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-sky-400"
        />
      </div>
      <p className="text-xs text-muted">
        {t("Keep the part, its packaging and the receipt until the claim is closed.")}{" "}
        <Link to="/legal/returns" target="_blank" rel="noopener" className="font-semibold text-link hover:underline">
          {t("Returns policy")}
        </Link>
      </p>
      {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className="btn-cta h-10 rounded-xl px-5 text-sm">
          {saving ? t("Sending…") : t("Send to the seller")}
        </button>
        <button type="button" onClick={onCancel} className="h-10 rounded-xl px-4 text-sm font-semibold text-muted hover:bg-surface-3">
          {t("Cancel")}
        </button>
      </div>
    </form>
  );
}

export default function ItemIssue({ reference, item, onChange }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const issue = item.issue;
  const showStatus = issue && !(issue.status === "closed" && issue.outcome === "withdrawn" && item.can_report);

  return (
    <div>
      {showStatus ? <IssueStatus issue={issue} onChange={onChange} /> : null}
      {item.can_report && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink hover:underline"
        >
          <Icon name="warning" className="h-3.5 w-3.5" />
          {t("Problem with this part?")}
          {item.report_until ? <span className="font-normal">({t("until {date}", { date: shortDate(item.report_until) })})</span> : null}
        </button>
      ) : null}
      {item.can_report && open ? (
        <IssueForm
          reference={reference}
          item={item}
          onCancel={() => setOpen(false)}
          onDone={async () => {
            setOpen(false);
            await onChange?.();
          }}
        />
      ) : null}
    </div>
  );
}
