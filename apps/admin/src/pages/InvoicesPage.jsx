import { companyLine } from "@parthub/shared/legal";
import { useEffect, useState } from "react";
import { formatMoney } from "@parthub/shared";
import { api } from "../lib/api";
import { useT } from "../i18n";

// Commission invoices and payments (API: /api/v1/admin/invoices…, rules in
// workers/api/src/utils/invoices.ts). One invoice per seller and month,
// once the month is over and every sale of it is final. Payments are bank
// transfers (or other) with their date and reference.

const lastMonth = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
};
const today = () => new Date().toISOString().slice(0, 10);
const day = (v) => String(v || "").slice(0, 10);

const STATUS = {
  issued: ["Unpaid", "bg-amber-50 text-amber-800"],
  paid: ["Paid", "bg-emerald-50 text-emerald-700"],
  cancelled: ["Cancelled", "bg-gray-100 text-gray-600"],
};
const METHODS = { bank_transfer: "Bank transfer", cash: "Cash", cheque: "Cheque", other: "Other" };

function Kpi({ label, value }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function CommissionLines({ sellerId, month, onChanged }) {
  const t = useT();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const load = () =>
    api.get(`/api/v1/admin/commissions?seller_id=${sellerId}&month=${month}`).then((r) => setRows(r?.data || [])).catch((e) => setError(e?.message || ""));
  useEffect(() => {
    load();
  }, [sellerId, month]); // eslint-disable-line react-hooks/exhaustive-deps

  async function waive(id) {
    const note = window.prompt(t("Why no commission on this sale? (kept in the log)"));
    if (!note || !note.trim()) return;
    try {
      await api.post(`/api/v1/admin/commissions/${id}/waive`, { note: note.trim() });
      await load();
      onChanged();
    } catch (e) {
      setError(e?.message || t("Something went wrong. Please try again."));
    }
  }

  if (!rows) return <p className="mt-2 text-xs text-gray-500">{t("Loading…")}</p>;
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-gray-100">
      {error ? <p className="p-2 text-xs text-red-700" role="alert">{error}</p> : null}
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th scope="col" className="px-3 py-2 text-start">{t("Order")}</th>
            <th scope="col" className="px-3 py-2 text-start">{t("Part")}</th>
            <th scope="col" className="px-3 py-2 text-end">{t("Base")}</th>
            <th scope="col" className="px-3 py-2 text-end">{t("Commission")}</th>
            <th scope="col" className="px-3 py-2 text-start">{t("Status")}</th>
            <th scope="col" className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((l) => (
            <tr key={l.id}>
              <td className="px-3 py-2 font-mono" dir="ltr">{l.reference}</td>
              <td className="px-3 py-2">{l.title}</td>
              <td className="px-3 py-2 text-end font-mono">{formatMoney(l.base)}</td>
              <td className="px-3 py-2 text-end font-mono">{formatMoney(l.amount)} ({Number(l.rate_bps) / 100}%)</td>
              <td className="px-3 py-2">{t(l.status)}</td>
              <td className="px-3 py-2 text-end">
                {l.status === "accrued" && Number(l.amount) > 0 ? (
                  <button type="button" onClick={() => waive(l.id)} className="font-semibold text-red-700 hover:underline">{t("Waive")}</button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentForm({ invoice, onDone }) {
  const t = useT();
  const [amount, setAmount] = useState(String(invoice.balance / 100));
  const [paidOn, setPaidOn] = useState(today());
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [state, setState] = useState({ saving: false, error: "" });

  async function submit(e) {
    e.preventDefault();
    setState({ saving: true, error: "" });
    try {
      await api.post(`/api/v1/admin/invoices/${invoice.id}/payments`, { amount, paid_on: paidOn, method, reference: reference.trim() });
      setState({ saving: false, error: "" });
      onDone();
    } catch (err) {
      setState({ saving: false, error: err?.message || t("Something went wrong. Please try again.") });
    }
  }

  const field = "h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900";
  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-gray-50 p-3">
      <label className="text-xs font-semibold text-gray-700">
        {t("Amount received (MAD)")}
        <input inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} className={`${field} mt-1 block w-32 font-mono`} />
      </label>
      <label className="text-xs font-semibold text-gray-700">
        {t("Transfer date")}
        <input type="date" required max={today()} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className={`${field} mt-1 block`} />
      </label>
      <label className="text-xs font-semibold text-gray-700">
        {t("Method")}
        <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${field} mt-1 block`}>
          {Object.entries(METHODS).map(([k, v]) => (
            <option key={k} value={k}>{t(v)}</option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-gray-700">
        {t("Bank reference")}
        <input value={reference} maxLength={80} onChange={(e) => setReference(e.target.value)} className={`${field} mt-1 block w-40`} />
      </label>
      <button type="submit" disabled={state.saving} className="h-10 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300">
        {state.saving ? t("Saving…") : t("Record payment")}
      </button>
      {state.error ? <p className="basis-full text-xs text-red-700" role="alert">{state.error}</p> : null}
    </form>
  );
}

export default function InvoicesPage() {
  const t = useT();
  const [month, setMonth] = useState(lastMonth());
  const [draft, setDraft] = useState(null);
  const [list, setList] = useState(null);
  const [open, setOpen] = useState({}); // seller_id → show lines; "pay:<id>" → payment form
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const refresh = () => setReload((n) => n + 1);

  useEffect(() => {
    let active = true;
    setError("");
    Promise.all([api.get(`/api/v1/admin/invoices/draft?month=${month}`), api.get("/api/v1/admin/invoices")])
      .then(([d, l]) => {
        if (!active) return;
        setDraft(d?.data || null);
        setList(l?.data || null);
      })
      .catch((err) => active && setError(err?.message || t("Something went wrong. Please try again.")));
    return () => {
      active = false;
    };
  }, [month, reload]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(promise) {
    setError("");
    try {
      await promise;
      refresh();
    } catch (err) {
      setError(err?.message || t("Something went wrong. Please try again."));
    }
  }

  function issue(s) {
    if (!window.confirm(t("Issue the invoice of {seller} for {amount}?", { seller: s.name, amount: formatMoney(s.amount) }))) return;
    act(api.post("/api/v1/admin/invoices", { seller_id: s.seller_id, month }));
  }

  function cancel(inv) {
    const note = window.prompt(t("Why cancel invoice {number}? (kept in the log)", { number: inv.number }));
    if (!note || !note.trim()) return;
    act(api.post(`/api/v1/admin/invoices/${inv.id}/cancel`, { note: note.trim() }));
  }

  const totals = list?.totals;

  return (
    <section className="space-y-6 pb-16">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-700 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">{t("Invoices")}</h1>
        <p className="mt-3 max-w-3xl text-sm text-emerald-100 sm:text-base">
          {t("Commission invoices per seller and month, the payments received and what is still due. A month can be invoiced once it is over and all its sales are final.")}
        </p>
      </div>

      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p> : null}

      {totals ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("Recorded, not invoiced")} value={formatMoney(totals.to_invoice)} />
          <Kpi label={t("Invoiced")} value={formatMoney(totals.invoiced)} />
          <Kpi label={t("Paid")} value={formatMoney(totals.paid)} />
          <Kpi label={t("Outstanding")} value={formatMoney(totals.outstanding)} />
        </div>
      ) : null}

      <div className="rounded-3xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-xl font-bold">{t("To invoice")}</h2>
          <div>
            <label htmlFor="inv-month" className="mb-1 block text-sm font-semibold text-gray-800">{t("Delivery month")}</label>
            <input id="inv-month" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900" />
          </div>
        </div>
        {!draft ? (
          <div className="mt-4 h-20 animate-pulse rounded-2xl bg-gray-50" />
        ) : draft.sellers.length ? (
          <ul className="mt-4 divide-y divide-gray-100">
            {draft.sellers.map((s) => {
              const blocked = !s.month_closed
                ? t("Month not over")
                : s.invoice
                  ? t("Invoiced: {number}", { number: s.invoice.number })
                  : s.pending_lines
                    ? t("{n} sale(s) not final yet", { n: s.pending_lines })
                    : s.amount <= 0
                      ? t("Nothing due")
                      : "";
              return (
                <li key={s.seller_id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-semibold">{s.name}</span>
                    <span className="flex flex-wrap items-center gap-3">
                      <span className="font-mono">{formatMoney(s.amount)} · {t("{n} sales", { n: s.lines })}</span>
                      <button type="button" onClick={() => setOpen((o) => ({ ...o, [s.seller_id]: !o[s.seller_id] }))} className="text-xs font-semibold text-blue-700 hover:underline">
                        {open[s.seller_id] ? t("Hide sales") : t("Sales")}
                      </button>
                      {blocked ? (
                        <span className="text-xs text-gray-500">{blocked}</span>
                      ) : (
                        <button type="button" onClick={() => issue(s)} className="h-9 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700">
                          {t("Issue invoice")}
                        </button>
                      )}
                    </span>
                  </div>
                  {open[s.seller_id] ? <CommissionLines sellerId={s.seller_id} month={month} onChanged={refresh} /> : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-gray-500">{t("No delivered sales this month.")}</p>
        )}
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
        <h2 className="text-xl font-bold">{t("Invoices issued")}</h2>
        <p className="mt-1 text-xs text-gray-500">
          {companyLine() ? t("Issuer: {company}", { company: companyLine() }) : t("Issuer details appear here once the company is registered (packages/shared/src/legal/company.js).")}
        </p>
        {!list ? (
          <div className="mt-4 h-20 animate-pulse rounded-2xl bg-gray-50" />
        ) : list.invoices.length ? (
          <ul className="mt-4 divide-y divide-gray-100">
            {list.invoices.map((inv) => {
              const [label, cls] = STATUS[inv.status] || STATUS.issued;
              return (
                <li key={inv.id} className="py-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono font-semibold" dir="ltr">{inv.number}</p>
                      <p className="text-xs text-gray-500">
                        {inv.seller_name} · {inv.period} · {t("issued {date}, due {due}", { date: day(inv.issued_at), due: inv.due_date })}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={["rounded-full px-2.5 py-1 text-xs font-semibold", cls].join(" ")}>{t(label)}</span>
                      {inv.overdue ? <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">{t("Overdue")}</span> : null}
                      {!inv.reconciled ? (
                        <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">{t("Amount ≠ its sales: check")}</span>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 font-mono text-gray-800">
                    {t("Amount {amount} · paid {paid} · balance {balance}", {
                      amount: formatMoney(inv.amount),
                      paid: formatMoney(inv.paid),
                      balance: formatMoney(inv.balance),
                    })}
                  </p>
                  {inv.payments?.length ? (
                    <ul className="mt-1 space-y-0.5 text-xs text-gray-600">
                      {inv.payments.map((p) => (
                        <li key={p.id}>
                          {p.paid_on} · {formatMoney(p.amount)} · {t(METHODS[p.method] || p.method)}
                          {p.reference ? ` · ${p.reference}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {inv.status === "issued" ? (
                    <div className="mt-2 flex flex-wrap gap-3">
                      <button type="button" onClick={() => setOpen((o) => ({ ...o, [`pay:${inv.id}`]: !o[`pay:${inv.id}`] }))} className="text-xs font-semibold text-emerald-700 hover:underline">
                        {t("Record payment")}
                      </button>
                      {!inv.paid ? (
                        <button type="button" onClick={() => cancel(inv)} className="text-xs font-semibold text-red-700 hover:underline">{t("Cancel invoice")}</button>
                      ) : null}
                    </div>
                  ) : null}
                  {open[`pay:${inv.id}`] && inv.status === "issued" ? (
                    <PaymentForm invoice={inv} onDone={() => { setOpen((o) => ({ ...o, [`pay:${inv.id}`]: false })); refresh(); }} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-gray-500">{t("No invoice yet. While selling is free (0%), there is nothing to invoice.")}</p>
        )}
      </div>
    </section>
  );
}
