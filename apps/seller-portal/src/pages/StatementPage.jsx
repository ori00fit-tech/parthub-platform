import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatMoney } from "@parthub/shared";
import { api } from "../lib/api";
import { useT } from "../i18n";

// The seller's monthly statement: sales delivered that month and the
// PartHub commission on each (API: GET /api/v1/marketplace/me/statement;
// rules in workers/api/src/utils/commissions.ts).

const thisMonth = () => new Date().toISOString().slice(0, 7);

function monthLabel(period) {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
}

function day(value) {
  if (!value) return "";
  const d = new Date(`${String(value).replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

const STATUS = {
  pending: ["Returns window open", "bg-amber-50 text-amber-800"],
  accrued: ["Final", "bg-emerald-50 text-emerald-800"],
  invoiced: ["Invoiced", "bg-blue-50 text-blue-800"],
  paid: ["Paid", "bg-gray-100 text-gray-700"],
  waived: ["Returned: no commission", "bg-gray-100 text-gray-700"],
};

export default function StatementPage() {
  const t = useT();
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setError("");
    api
      .get(`/api/v1/marketplace/me/statement?month=${month}`)
      .then((res) => active && setData(res?.data || null))
      .catch((err) => active && setError(err?.message || t("Something went wrong. Please try again.")));
    return () => {
      active = false;
    };
  }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

  const months = data ? [...new Set([thisMonth(), ...(data.months || [])])] : [thisMonth()];
  const free = data && Number(data.rate_bps) === 0;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t("Statement")}</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          {t("Your sales delivered each month. A sale becomes final 7 days after delivery, when the returns window closes.")}
        </p>
      </div>

      {free ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {t("Selling on PartHub is free during the launch: no commission. You will be told at least 30 days before any change.")}{" "}
          <Link to="/legal/seller" className="font-semibold underline">{t("Seller agreement")}</Link>
        </p>
      ) : null}

      {data?.upcoming?.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="note">
          <p className="font-semibold">{t("Commission change announced")}</p>
          <ul className="mt-1 list-disc ps-5">
            {data.upcoming.map((r) => (
              <li key={r.effective_from}>
                {t("{pct}% on sales whose returns window ends from {date} (announced on {announced})", {
                  pct: Number(r.rate_bps) / 100,
                  date: day(r.effective_from),
                  announced: day(r.announced_at),
                })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <label htmlFor="st-month" className="mb-1 block text-sm font-semibold text-gray-800">{t("Month")}</label>
        <select id="st-month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm">
          {months.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
      </div>

      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p> : null}

      {!data ? (
        <div className="h-32 animate-pulse rounded-3xl bg-white" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">{t("Delivered sales")}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-gray-900">{formatMoney(data.totals.sales)}</p>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">{t("In the returns window")}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-gray-900">{formatMoney(data.totals.pending_sales)}</p>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">{t("PartHub commission")}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-gray-900">{formatMoney(data.totals.commission)}</p>
            </div>
          </div>

          {data.lines.length ? (
            <div className="overflow-x-auto rounded-3xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-start">{t("Delivered")}</th>
                    <th scope="col" className="px-4 py-3 text-start">{t("Part")}</th>
                    <th scope="col" className="px-4 py-3 text-end">{t("Sale")}</th>
                    <th scope="col" className="px-4 py-3 text-end">{t("Commission")}</th>
                    <th scope="col" className="px-4 py-3 text-start">{t("Status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.lines.map((l) => {
                    const [label, cls] = STATUS[l.status] || STATUS.pending;
                    return (
                      <tr key={l.id}>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">{day(l.delivered_at)}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{l.title}</p>
                          <p className="font-mono text-xs text-gray-500" dir="ltr">{l.reference}</p>
                        </td>
                        <td className="px-4 py-3 text-end font-mono">{formatMoney(l.subtotal)}</td>
                        <td className="px-4 py-3 text-end font-mono">
                          {l.status === "pending" ? "—" : `${formatMoney(l.amount || 0)}${l.rate_bps ? ` (${Number(l.rate_bps) / 100}%)` : ""}`}
                          {l.status === "accrued" && l.base != null && Number(l.base) < Number(l.subtotal) ? (
                            <span className="block text-xs text-gray-500">{t("on {amount} kept after a partial refund", { amount: formatMoney(l.base) })}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <span className={["rounded-full px-2.5 py-1 text-xs font-semibold", cls].join(" ")}>{t(label)}</span>
                          {l.status === "pending" ? <span className="ms-2 text-xs text-gray-500">{t("until {date}", { date: day(l.returns_until) })}</span> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">{t("No delivered sales this month.")}</p>
          )}
        </>
      )}
    </section>
  );
}
