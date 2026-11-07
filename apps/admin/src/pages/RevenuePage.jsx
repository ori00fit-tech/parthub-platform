import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatMoney } from "@parthub/shared";
import { api } from "../lib/api";
import { useT } from "../i18n";

// Marketplace figures and the commission ledger
// (API: GET /api/v1/admin/revenue, POST/DELETE /api/v1/admin/commission-rates;
// rules in workers/api/src/utils/commissions.ts).

const thisMonth = () => new Date().toISOString().slice(0, 7);

function monthLabel(period) {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, { month: "short", year: "numeric", timeZone: "UTC" });
}

function Kpi({ label, value, hint }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

const day = (v) => String(v || "").slice(0, 10);
const inDays = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

// Rates are dated and never edited: schedule a new one, or cancel one that
// has not started. A higher rate must start 30+ days from today (the
// sellers see it on their statement as soon as it is scheduled).
function CommissionSchedule({ data, onChanged }) {
  const t = useT();
  const notice = data.notice_days || 30;
  const [value, setValue] = useState("");
  const [from, setFrom] = useState(inDays(notice));
  const [note, setNote] = useState("");
  const [state, setState] = useState({ saving: false, error: "", ok: "" });

  async function run(promise, okText) {
    setState({ saving: true, error: "", ok: "" });
    try {
      await promise;
      setState({ saving: false, error: "", ok: okText });
      setValue("");
      setNote("");
      onChanged();
    } catch (err) {
      setState({ saving: false, error: err?.message || t("Something went wrong. Please try again."), ok: "" });
    }
  }

  function schedule(e) {
    e.preventDefault();
    const pct = Number(String(value).replace(",", "."));
    if (pct > 0 && !window.confirm(t("Schedule {pct}% from {date}? Update the seller agreement and tell the sellers: they see it on their statement from now on.", { pct, date: from }))) return;
    run(api.post("/api/v1/admin/commission-rates", { rate_percent: value, effective_from: from, note: note.trim() }), t("Scheduled."));
  }

  function cancel(id) {
    if (!window.confirm(t("Cancel this scheduled rate?"))) return;
    run(api.delete(`/api/v1/admin/commission-rates/${id}`), t("Cancelled."));
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">{t("Commission rate")}</h2>
      <p className="mt-1 text-sm text-gray-500">
        {t("Each sale uses the rate in force on the day its 7-day returns window ends, whenever it is recorded. A higher rate needs {n} days notice. 0% = free.", { n: notice })}
      </p>
      <p className="mt-3 text-sm font-semibold">
        {t("Rate now: {pct}%", { pct: (data.rate_bps / 100).toLocaleString() })}
        {data.rate_bps === 0 ? <span className="ms-2 font-normal text-emerald-700">{t("Selling is free: sales are recorded at 0%.")}</span> : null}
      </p>
      {data.upcoming?.length ? (
        <ul className="mt-3 space-y-2">
          {data.upcoming.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <span>{t("{pct}% from {date}", { pct: (r.rate_bps / 100).toLocaleString(), date: day(r.effective_from) })}{r.note ? ` · ${r.note}` : ""}</span>
              <button type="button" onClick={() => cancel(r.id)} disabled={state.saving} className="text-xs font-semibold text-red-700 hover:underline">
                {t("Cancel")}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <form onSubmit={schedule} className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="rate" className="mb-1 block text-sm font-semibold text-gray-800">{t("Rate (%)")}</label>
          <input id="rate" inputMode="decimal" required value={value} onChange={(e) => setValue(e.target.value)} className="h-11 w-24 rounded-xl border border-gray-200 bg-white px-3 font-mono text-sm text-gray-900 outline-none focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="from" className="mb-1 block text-sm font-semibold text-gray-800">{t("Starts on")}</label>
          <input id="from" type="date" required min={inDays(0)} value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900" />
        </div>
        <div className="min-w-[10rem] flex-1">
          <label htmlFor="rate-note" className="mb-1 block text-sm font-semibold text-gray-800">{t("Note (optional)")}</label>
          <input id="rate-note" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900" />
        </div>
        <button type="submit" disabled={state.saving} className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300">
          {state.saving ? t("Saving…") : t("Schedule")}
        </button>
      </form>
      {state.error ? <p className="mt-3 text-sm text-red-700" role="alert">{state.error}</p> : null}
      {state.ok ? <p className="mt-3 text-sm text-emerald-700" role="status">{state.ok}</p> : null}

      {data.rates?.length > 1 ? (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-semibold text-gray-700">{t("History")}</summary>
          <ul className="mt-2 space-y-1 text-gray-600">
            {data.rates.map((r) => (
              <li key={r.id} className={r.cancelled_at ? "line-through" : ""}>
                {t("{pct}% from {date}", { pct: (r.rate_bps / 100).toLocaleString(), date: day(r.effective_from) })} · {t("set on {date}", { date: day(r.created_at) })}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export default function RevenuePage() {
  const t = useT();
  const [month, setMonth] = useState(thisMonth());
  const [what, setWhat] = useState("5"); // simulation: commission at this %
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setError("");
    api
      .get(`/api/v1/admin/revenue?month=${month}`)
      .then((res) => active && setData(res?.data || null))
      .catch((err) => active && setError(err?.message || t("Something went wrong. Please try again.")));
    return () => {
      active = false;
    };
  }, [month, reload]); // eslint-disable-line react-hooks/exhaustive-deps

  const cur = data?.months?.find((m) => m.period === month) || null;
  const simPct = Math.max(0, Math.min(20, Number(String(what).replace(",", ".")) || 0));
  const simulate = (gmv) => Math.round((gmv * simPct) / 100);

  return (
    <section className="space-y-6 pb-16">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">{t("Revenue")}</h1>
        <p className="mt-3 max-w-3xl text-sm text-indigo-100 sm:text-base">
          {t("Delivered sales (GMV), orders, cancellations and returns, and the commission ledger. Sales count in the month they were delivered.")}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-3xl border border-gray-200 bg-white p-5 text-gray-900 shadow-sm">
        <div>
          <label htmlFor="month" className="mb-1 block text-sm font-semibold text-gray-800">{t("Month")}</label>
          <input id="month" type="month" value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900" />
        </div>
        <div>
          <label htmlFor="sim" className="mb-1 block text-sm font-semibold text-gray-800">{t("Simulate a commission of (%)")}</label>
          <input id="sim" inputMode="decimal" value={what} onChange={(e) => setWhat(e.target.value)} className="h-11 w-24 rounded-xl border border-gray-200 bg-white px-3 font-mono text-sm text-gray-900" />
        </div>
      </div>

      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p> : null}

      {!data ? (
        <div className="h-40 animate-pulse rounded-3xl bg-white" />
      ) : (
        <>
          {data.stuck_shipments?.lines ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
              {t("{n} line(s) shipped more than {days} days ago are still not delivered ({value}). Check with the sellers: the buyer can also confirm receipt.", {
                n: data.stuck_shipments.lines,
                days: data.stuck_shipments.days,
                value: formatMoney(data.stuck_shipments.value),
              })}{" "}
              <Link to="/orders" className="font-semibold underline">{t("Orders")}</Link>
            </p>
          ) : null}
          {data.ledger ? (
            <p className="text-sm text-gray-600">
              {t("Commission ledger: {to_invoice} to invoice · {outstanding} outstanding · {paid} paid.", {
                to_invoice: formatMoney(data.ledger.to_invoice),
                outstanding: formatMoney(data.ledger.outstanding),
                paid: formatMoney(data.ledger.paid),
              })}{" "}
              <Link to="/invoices" className="font-semibold text-blue-700 hover:underline">{t("Invoices")}</Link>
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label={t("Delivered sales (GMV)")} value={formatMoney(cur?.gmv || 0)} hint={t("{n} orders delivered", { n: cur?.orders_delivered || 0 })} />
            <Kpi
              label={t("Commission recorded")}
              value={formatMoney(cur?.commission || 0)}
              hint={t("Rate now: {pct}%", { pct: (data.rate_bps / 100).toLocaleString() })}
            />
            <Kpi label={t("At {pct}% it would be", { pct: simPct })} value={formatMoney(simulate(cur?.gmv || 0))} hint={t("Simulation on this month's delivered sales")} />
            <Kpi
              label={t("Cancelled and returned")}
              value={`${cur?.lines_cancelled || 0} · ${cur?.returns || 0}`}
              hint={t("Cancelled lines ({value}) · returns resolved for the buyer", { value: formatMoney(cur?.cancelled_value || 0) })}
            />
          </div>

          <div className="overflow-x-auto rounded-3xl border border-gray-200 bg-white text-gray-900 shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th scope="col" className="px-4 py-3 text-start">{t("Month")}</th>
                  <th scope="col" className="px-4 py-3 text-end">{t("GMV")}</th>
                  <th scope="col" className="px-4 py-3 text-end">{t("Orders")}</th>
                  <th scope="col" className="px-4 py-3 text-end">{t("Cancelled")}</th>
                  <th scope="col" className="px-4 py-3 text-end">{t("Returns")}</th>
                  <th scope="col" className="px-4 py-3 text-end">{t("Commission")}</th>
                  <th scope="col" className="px-4 py-3 text-end">{t("At {pct}%", { pct: simPct })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.months.map((m) => (
                  <tr key={m.period} className={m.period === month ? "bg-blue-50/50" : ""}>
                    <td className="px-4 py-3 font-semibold text-gray-900">{monthLabel(m.period)}</td>
                    <td className="px-4 py-3 text-end font-mono">{formatMoney(m.gmv)}</td>
                    <td className="px-4 py-3 text-end font-mono">{m.orders_delivered}</td>
                    <td className="px-4 py-3 text-end font-mono">{m.lines_cancelled}</td>
                    <td className="px-4 py-3 text-end font-mono">{m.returns}</td>
                    <td className="px-4 py-3 text-end font-mono">{formatMoney(m.commission)}</td>
                    <td className="px-4 py-3 text-end font-mono text-gray-500">{formatMoney(simulate(m.gmv))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">{t("Sellers in {month}", { month: monthLabel(month) })}</h2>
              {data.sellers.length ? (
                <ul className="mt-4 divide-y divide-gray-100">
                  {data.sellers.map((s) => (
                    <li key={s.seller_id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                      <Link to={`/sellers/${s.seller_id}`} className="font-semibold text-blue-700 hover:underline">{s.name}</Link>
                      <span className="font-mono text-gray-700">
                        {formatMoney(s.gmv)} · {t("{n} orders", { n: s.orders })} · {t("commission {amount}", { amount: formatMoney(s.commission) })}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-gray-500">{t("No delivered sales this month.")}</p>
              )}
            </div>
            <CommissionSchedule data={data} onChanged={() => setReload((n) => n + 1)} />
          </div>
        </>
      )}
    </section>
  );
}
