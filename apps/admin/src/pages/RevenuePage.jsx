import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatMoney } from "@parthub/shared";
import { api } from "../lib/api";
import { useT } from "../i18n";

// Marketplace figures and the commission ledger
// (API: GET /api/v1/admin/revenue, PUT /api/v1/admin/settings/commission;
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

function CommissionSetting({ rateBps, onSaved }) {
  const t = useT();
  const [value, setValue] = useState(String(rateBps / 100));
  const [state, setState] = useState({ saving: false, error: "", ok: "" });
  useEffect(() => setValue(String(rateBps / 100)), [rateBps]);

  async function save(e) {
    e.preventDefault();
    const pct = Number(String(value).replace(",", "."));
    if (pct > 0 && !window.confirm(t("Start charging {pct}% on new sales? The seller agreement promises sellers at least 30 days notice: update it and tell them first.", { pct }))) return;
    setState({ saving: true, error: "", ok: "" });
    try {
      const res = await api.put("/api/v1/admin/settings/commission", { rate_percent: value });
      setState({ saving: false, error: "", ok: t("Saved.") });
      onSaved(res?.data?.rate_bps ?? 0);
    } catch (err) {
      setState({ saving: false, error: err?.message || t("Something went wrong. Please try again."), ok: "" });
    }
  }

  return (
    <form onSubmit={save} className="rounded-3xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">{t("Commission rate")}</h2>
      <p className="mt-1 text-sm text-gray-500">
        {t("Applies to sales recorded from now on (after their 7-day returns window), never to past ones. 0% = free.")}
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="rate" className="mb-1 block text-sm font-semibold text-gray-800">{t("Rate (%)")}</label>
          <input
            id="rate"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-11 w-28 rounded-xl border border-gray-200 bg-white px-3 font-mono text-sm text-gray-900 outline-none focus:border-blue-500"
          />
        </div>
        <button type="submit" disabled={state.saving} className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300">
          {state.saving ? t("Saving…") : t("Save")}
        </button>
      </div>
      {rateBps === 0 ? <p className="mt-3 text-sm text-emerald-700">{t("Selling is free: sales are recorded at 0%.")}</p> : null}
      {state.error ? <p className="mt-3 text-sm text-red-700" role="alert">{state.error}</p> : null}
      {state.ok ? <p className="mt-3 text-sm text-emerald-700" role="status">{state.ok}</p> : null}
    </form>
  );
}

export default function RevenuePage() {
  const t = useT();
  const [month, setMonth] = useState(thisMonth());
  const [what, setWhat] = useState("5"); // simulation: commission at this %
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

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
  }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

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
            <CommissionSetting rateBps={data.rate_bps} onSaved={(bps) => setData((d) => ({ ...d, rate_bps: bps }))} />
          </div>
        </>
      )}
    </section>
  );
}
