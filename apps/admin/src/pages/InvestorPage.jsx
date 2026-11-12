import { useEffect, useState } from "react";
import { ADMIN_TOKEN_KEY, formatMoney } from "@parthub/shared";
import { BASE_URL, api } from "../lib/api";
import { useT } from "../i18n";

// Investor metrics (API: GET /api/v1/admin/kpis, /kpis.csv; definitions in
// workers/api/src/utils/kpis.ts). Computed from production data only.
// One single-series bar chart per metric (small multiples, one axis each);
// the current month is partial and drawn lighter; every figure is also in
// the table view and the CSV.

const pct = (v) => (v == null ? "—" : `${(v * 100).toFixed(1)} %`);
const int = (v) => (v == null ? "—" : Number(v).toLocaleString());
const mad = (v) => (v == null ? "—" : formatMoney(v));
const days = (v) => (v == null ? "—" : Number(v).toFixed(1));
const monthLabel = (p) => {
  const [y, m] = p.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, { month: "short", year: "2-digit", timeZone: "UTC" });
};

// change vs previous month, as text (no colour: up is not always good)
function delta(cur, prev) {
  if (cur == null || prev == null) return null;
  if (prev === 0) return cur === 0 ? "=" : "new";
  const d = (cur - prev) / Math.abs(prev);
  return `${d >= 0 ? "+" : ""}${(d * 100).toFixed(0)} %`;
}

function Tile({ label, value, sub }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-gray-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-gray-500">{sub}</p> : null}
    </div>
  );
}

// One metric over the months: bars from a zero baseline, 2px gaps, 4px
// rounded tops, hover tooltip, the max value as the only axis label.
function Bars({ title, months, get, format, current, note }) {
  const t = useT();
  const [hover, setHover] = useState(null);
  const values = months.map((m) => get(m));
  const max = Math.max(0, ...values.map((v) => (v == null ? 0 : v)));
  const shown = hover != null ? months[hover] : null;
  return (
    <figure className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        <span className="text-xs text-gray-500">{t("max {value}", { value: format(max) })}</span>
      </figcaption>
      <div className="relative mt-3 h-28 border-b border-gray-300" onMouseLeave={() => setHover(null)}>
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {months.map((m, i) => {
            const v = values[i];
            const h = v == null || max === 0 ? 0 : Math.max(2, (v / max) * 100);
            return (
              <div
                key={m.period}
                className="flex h-full flex-1 items-end"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                tabIndex={0}
                aria-label={`${monthLabel(m.period)}: ${v == null ? "—" : format(v)}`}
              >
                <div
                  className={["w-full rounded-t-[4px]", m.period === current ? "bg-blue-300" : "bg-blue-600", hover === i ? "ring-2 ring-white ring-offset-0" : ""].join(" ")}
                  style={{ height: `${h}%` }}
                />
              </div>
            );
          })}
        </div>
        {shown ? (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow"
            style={{
              left: `${Math.min(85, Math.max(15, ((hover + 0.5) / months.length) * 100))}%`,
              bottom: `${Math.min(100, ((values[hover] == null || max === 0 ? 0 : values[hover] / max) * 100)) + 6}%`,
            }}
          >
            <span className="font-semibold">{monthLabel(shown.period)}</span>
            {shown.period === current ? ` (${t("so far")})` : ""}: {get(shown) == null ? "—" : format(get(shown))}
          </div>
        ) : null}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-gray-500">
        <span>{monthLabel(months[0].period)}</span>
        <span>{monthLabel(months[months.length - 1].period)}</span>
      </div>
      {note ? <p className="mt-2 text-xs text-gray-500">{note}</p> : null}
    </figure>
  );
}

const COLUMNS = [
  ["stores_new", "New stores", (m) => int(m.sellers_new)],
  ["stores_selling", "Stores with orders", (m) => int(m.sellers_selling)],
  ["parts_new", "New parts", (m) => int(m.parts_new)],
  ["buyers_new", "New buyer accounts", (m) => int(m.buyers_new)],
  ["buyers_ordering", "Buyers who ordered", (m) => int(m.buyers_ordering)],
  ["buyers_repeat", "Repeat buyers", (m) => int(m.buyers_repeat)],
  ["requests", "Part requests", (m) => int(m.requests)],
  ["searches", "Searches", (m) => int(m.searches)],
  ["searches_no_result", "Searches with no result", (m) => int(m.searches_no_result)],
  ["orders", "Orders", (m) => int(m.orders)],
  ["gmv_placed", "GMV ordered", (m) => mad(m.gmv_placed)],
  ["gmv_delivered", "GMV delivered", (m) => mad(m.gmv_delivered)],
  ["aov", "Average delivered order", (m) => mad(m.aov_delivered)],
  ["success", "Delivery success", (m) => pct(m.delivery_success_rate)],
  ["returns", "Return rate", (m) => pct(m.return_rate)],
  ["days", "Days to delivery", (m) => days(m.avg_days_to_delivery)],
  ["commission", "Commission", (m) => mad(m.commission)],
];

export default function InvestorPage() {
  const t = useT();
  const [months, setMonths] = useState(12);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [table, setTable] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    setError("");
    api
      .get(`/api/v1/admin/kpis?months=${months}`)
      .then((r) => active && setData(r?.data || null))
      .catch((err) => active && setError(err?.message || t("Something went wrong. Please try again.")));
    return () => {
      active = false;
    };
  }, [months]); // eslint-disable-line react-hooks/exhaustive-deps

  async function downloadCsv() {
    setDownloading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/admin/kpis.csv?months=24`, { headers: { Authorization: `Bearer ${localStorage.getItem(ADMIN_TOKEN_KEY)}` } });
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = (res.headers.get("content-disposition") || "").match(/filename="([^"]+)"/)?.[1] || "parthub-kpis.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.message || t("Something went wrong. Please try again."));
    } finally {
      setDownloading(false);
    }
  }

  const list = data?.months || [];
  const cur = list[list.length - 1];
  const prev = list[list.length - 2];
  const now = data?.now || {};
  const share = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : "—");

  return (
    <section className="space-y-6 pb-16">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-800 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">{t("Investor metrics")}</h1>
        <p className="mt-3 max-w-3xl text-sm text-blue-100 sm:text-base">
          {t("The marketplace month by month, computed from production data: supply, demand, orders, delivery and returns. The definitions are at the bottom of the page.")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1" role="group" aria-label={t("Period")}>
          {[6, 12, 24].map((n) => (
            <button key={n} type="button" onClick={() => setMonths(n)} className={["h-8 rounded-lg px-3 text-sm font-semibold", months === n ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"].join(" ")}>
              {t("{n} months", { n })}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setTable((v) => !v)} className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50">
          {table ? t("Show charts") : t("Show table")}
        </button>
        <button type="button" onClick={downloadCsv} disabled={downloading} className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300">
          {downloading ? t("Preparing…") : t("Download CSV (24 months)")}
        </button>
        {data ? <span className="text-xs text-gray-400">{t("Computed at {time} (UTC)", { time: data.generated_at.slice(0, 16).replace("T", " ") })}</span> : null}
      </div>

      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p> : null}
      {!data ? (
        <div className="h-64 animate-pulse rounded-3xl bg-white" />
      ) : (
        <>
          <div>
            <h2 className="mb-3 text-lg font-bold text-white">{t("Today")}</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Tile label={t("Active stores")} value={int(now.sellers_active)} sub={t("{n} waiting for review", { n: int(now.sellers_pending) })} />
              <Tile label={t("Parts for sale")} value={int(now.parts_active)} sub={t("{photo} with a photo · {veh} with vehicles", { photo: share(now.parts_with_photo, now.parts_active), veh: share(now.parts_with_vehicles, now.parts_active) })} />
              <Tile label={t("Buyers")} value={int(now.buyers_total)} sub={t("{ordered} ordered · {repeat} ordered twice or more", { ordered: int(now.buyers_ordered), repeat: int(now.buyers_repeat_total) })} />
              <Tile label={t("Orders since launch")} value={int(now.orders_total)} sub={t("{gmv} delivered", { gmv: mad(now.gmv_delivered_total) })} />
            </div>
          </div>

          {cur ? (
            <div>
              <h2 className="mb-3 text-lg font-bold text-white">{t("{month} so far, vs {prev}", { month: monthLabel(cur.period), prev: prev ? monthLabel(prev.period) : "—" })}</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  [t("GMV delivered"), mad(cur.gmv_delivered), delta(cur.gmv_delivered, prev?.gmv_delivered)],
                  [t("Orders"), int(cur.orders), delta(cur.orders, prev?.orders)],
                  [t("Buyers who ordered"), int(cur.buyers_ordering), delta(cur.buyers_ordering, prev?.buyers_ordering)],
                  [t("Delivery success"), pct(cur.delivery_success_rate), prev ? `${t("last month")}: ${pct(prev.delivery_success_rate)}` : null],
                  [t("Return rate"), pct(cur.return_rate), prev ? `${t("last month")}: ${pct(prev.return_rate)}` : null],
                  [t("Days to delivery"), days(cur.avg_days_to_delivery), prev ? `${t("last month")}: ${days(prev.avg_days_to_delivery)}` : null],
                ].map(([label, value, sub]) => (
                  <Tile key={label} label={label} value={value} sub={sub ? (String(sub).includes(":") ? sub : `${sub} ${t("vs last month")}`) : null} />
                ))}
              </div>
            </div>
          ) : null}

          {table ? (
            <div className="overflow-x-auto rounded-3xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th scope="col" className="sticky left-0 bg-gray-50 px-3 py-2 text-start">{t("Month")}</th>
                    {COLUMNS.map(([k, label]) => <th key={k} scope="col" className="px-3 py-2 text-end">{t(label)}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {list.map((m) => (
                    <tr key={m.period}>
                      <th scope="row" className="sticky left-0 whitespace-nowrap bg-white px-3 py-2 text-start font-semibold text-gray-900">{monthLabel(m.period)}{m.period === cur?.period ? ` (${t("so far")})` : ""}</th>
                      {COLUMNS.map(([k, , f]) => <td key={k} className="whitespace-nowrap px-3 py-2 text-end font-mono text-gray-800">{f(m)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div>
              <h2 className="mb-1 text-lg font-bold text-white">{t("Month by month")}</h2>
              <p className="mb-3 text-xs text-gray-400">{t("Lighter bar: the current month, not finished.")}</p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Bars title={t("GMV delivered")} months={list} current={cur?.period} get={(m) => m.gmv_delivered} format={mad} />
                <Bars title={t("Orders")} months={list} current={cur?.period} get={(m) => m.orders} format={int} />
                <Bars title={t("Buyers who ordered")} months={list} current={cur?.period} get={(m) => m.buyers_ordering} format={int} />
                <Bars title={t("Stores with orders")} months={list} current={cur?.period} get={(m) => m.sellers_selling} format={int} />
                <Bars title={t("New parts")} months={list} current={cur?.period} get={(m) => m.parts_new} format={int} />
                <Bars title={t("Searches")} months={list} current={cur?.period} get={(m) => m.searches} format={int} note={t("Demand signal: what buyers look for, even when nothing is sold.")} />
                <Bars title={t("Delivery success")} months={list} current={cur?.period} get={(m) => (m.delivery_success_rate == null ? null : m.delivery_success_rate)} format={pct} />
                <Bars title={t("Return rate")} months={list} current={cur?.period} get={(m) => (m.return_rate == null ? null : m.return_rate)} format={pct} />
                <Bars title={t("Average delivered order")} months={list} current={cur?.period} get={(m) => m.aov_delivered} format={mad} />
              </div>
            </div>
          )}

          <details className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-700 shadow-sm">
            <summary className="cursor-pointer font-semibold text-gray-900">{t("How each figure is counted")}</summary>
            <ul className="mt-3 list-disc space-y-1.5 ps-5">
              <li>{t("Months are calendar months (UTC). Amounts in MAD, parts only (delivery fees excluded).")}</li>
              <li>{t("GMV ordered: all lines of the orders placed that month. GMV delivered: lines delivered that month (by delivery date).")}</li>
              <li>{t("Delivery success: for orders placed that month, delivered lines ÷ lines that reached an end (delivered, cancelled by the seller, or failed delivery). Lines still open are not counted.")}</li>
              <li>{t("Return rate: lines delivered that month whose claim was resolved for the buyer ÷ lines delivered that month.")}</li>
              <li>{t("Repeat buyers: buyers of the month who had already ordered in an earlier month.")}</li>
              <li>{t("Stores with orders: stores that received at least one order line that month.")}</li>
              <li>{t("Days to delivery: average time from the order to its delivery, for lines delivered that month.")}</li>
              <li>{t("Commission: recorded in the ledger (0 while selling is free).")}</li>
            </ul>
          </details>
        </>
      )}
    </section>
  );
}
