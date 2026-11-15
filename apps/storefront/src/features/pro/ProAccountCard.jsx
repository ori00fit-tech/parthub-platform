import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../lib/api";
import { useT } from "../../i18n";

// "Professional account" on /account (API: GET /api/v1/pro/me, POST
// /api/v1/pro/request; rules in workers/api/src/utils/pro.ts). Garages and
// mechanics ask once; PartHub checks; approved pros see and pay the pro
// prices sellers set.
const input = "mt-1 h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-sky-400";

export default function ProAccountCard() {
  const t = useT();
  const [pro, setPro] = useState(null);
  const [form, setForm] = useState({ business_name: "", city: "", ice: "" });
  const [state, setState] = useState({ busy: false, error: "" });

  useEffect(() => {
    apiGet("/api/v1/pro/me", undefined, { auth: true }).then((r) => setPro(r?.data || { status: null })).catch(() => setPro({ status: null }));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setState({ busy: true, error: "" });
    try {
      const r = await apiPost("/api/v1/pro/request", form, { auth: true });
      setPro(r?.data || { status: "pending" });
      setState({ busy: false, error: "" });
    } catch (err) {
      setState({ busy: false, error: err?.message || t("Something went wrong. Please try again.") });
    }
  }

  if (!pro) return null;
  const status = pro.status;

  return (
    <div id="pro" className="scroll-mt-24 rounded-3xl border border-emerald-600/30 bg-surface p-6 shadow-sm">
      <h2 className="text-lg font-bold text-ink">{t("Professional account")}</h2>
      <p className="mt-1 text-sm text-muted">{t("For garages and mechanics: see and pay the lower pro prices some sellers offer.")}</p>

      {status === "approved" ? (
        <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
          {t("Your pro account is approved ({name}). Pro prices show in the catalog and apply to your orders.", { name: pro.business_name })}
        </p>
      ) : null}

      {status === "pending" ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
          {t("Request sent for {name}. PartHub checks it and answers you.", { name: pro.business_name })}
        </p>
      ) : null}

      {status === "rejected" ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="status">
          {t("Your request was not accepted:")} {pro.note}
        </p>
      ) : null}

      {status === null || status === "rejected" ? (
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold text-ink sm:col-span-3">
            {t("Garage or workshop name")}
            <input value={form.business_name} onChange={set("business_name")} maxLength={120} className={input} required />
          </label>
          <label className="text-sm font-semibold text-ink">
            {t("City")}
            <input value={form.city} onChange={set("city")} maxLength={80} className={input} required />
          </label>
          <label className="text-sm font-semibold text-ink sm:col-span-2">
            {t("ICE (optional, 15 digits)")}
            <input value={form.ice} onChange={set("ice")} inputMode="numeric" maxLength={20} dir="ltr" className={input} />
          </label>
          <div className="sm:col-span-3">
            <button type="submit" disabled={state.busy} className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
              {state.busy ? t("Please wait...") : t("Ask for a pro account")}
            </button>
            {state.error ? <p className="mt-2 text-sm text-red-700" role="alert">{state.error}</p> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
