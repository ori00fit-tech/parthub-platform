import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { statusLabel, useT } from "../i18n";
import { notifyPendingChanged } from "../lib/pending";

// Professional accounts (API: GET /api/v1/admin/pro-accounts?status=,
// PUT /api/v1/admin/pro-accounts/:userId). Garages and mechanics who asked;
// check the business (name, city, ICE, a phone call) before approving: an
// approved pro sees and pays the pro prices sellers set.
const TABS = ["pending", "approved", "rejected", "all"];

export default function ProAccountsPage() {
  const t = useT();
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(0);

  async function load(status = tab) {
    try {
      setLoading(true);
      setError("");
      const r = await api.get(`/api/v1/admin/pro-accounts?status=${status}`);
      setRows(Array.isArray(r?.data) ? r.data : []);
    } catch (err) {
      setError(err?.message || t("Could not load"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(tab);
  }, [tab]);

  async function decide(row, approve) {
    let note = "";
    if (!approve) {
      note = window.prompt(t("Why is the request refused? The buyer sees this reason.")) || "";
      if (note.trim().length < 3) return;
    }
    try {
      setBusy(row.user_id);
      await api.put(`/api/v1/admin/pro-accounts/${row.user_id}`, { approve, note });
      notifyPendingChanged();
      await load();
    } catch (err) {
      setError(err?.message || t("Could not save"));
    } finally {
      setBusy(0);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-800 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">{t("Pro accounts")}</h1>
        <p className="mt-3 text-sm text-emerald-100 sm:text-base">
          {t("Garages and mechanics who asked for pro prices. Check the business (name, city, ICE, a call) before approving.")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={tab === s} onClick={() => setTab(s)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === s ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-200"}`}>
            {s === "all" ? t("All") : statusLabel(s)}
          </button>
        ))}
      </div>

      {error ? <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}

      {loading ? (
        <p className="text-sm text-gray-500">{t("Loading...")}</p>
      ) : rows.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">{t("No requests here.")}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.user_id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-gray-900">{row.business_name}</p>
                  <p className="text-sm text-gray-600">{row.city}{row.ice ? ` · ICE ${row.ice}` : ""}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {row.name} · <span dir="ltr">{row.email}</span>{row.phone ? <> · <span dir="ltr">{row.phone}</span></> : null}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {t("Asked on {date}", { date: row.requested_at })} · {t("{n} orders", { n: row.orders_count })}
                  </p>
                  {row.note ? <p className="mt-2 text-sm text-red-700">{t("Reason given:")} {row.note}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{statusLabel(row.status)}</span>
                  {row.status !== "approved" ? (
                    <button type="button" disabled={busy === row.user_id} onClick={() => decide(row, true)} className="h-10 rounded-2xl bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
                      {t("Approve")}
                    </button>
                  ) : null}
                  {row.status !== "rejected" ? (
                    <button type="button" disabled={busy === row.user_id} onClick={() => decide(row, false)} className="h-10 rounded-2xl border border-red-300 px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                      {row.status === "approved" ? t("Remove pro status") : t("Refuse")}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
