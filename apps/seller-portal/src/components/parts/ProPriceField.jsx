import { useEffect, useState } from "react";
import { centimesToInput, formatMoney, parseMoneyInput } from "@parthub/shared";
import { api } from "../../lib/api";
import { useT } from "../../i18n";

// Edit page: a lower price for professional buyers (garages, mechanics
// approved by PartHub). Saved on its own (PUT /me/parts/:id/pro-price), so
// the main form never erases it. Other buyers only see that a pro price
// exists, never the amount.
export default function ProPriceField({ partId }) {
  const t = useT();
  const [part, setPart] = useState(null);
  const [value, setValue] = useState("");
  const [state, setState] = useState({ saving: false, error: "", saved: false });

  useEffect(() => {
    let active = true;
    api
      .get(`/api/v1/marketplace/me/parts/${partId}`)
      .then((res) => {
        if (!active) return;
        setPart(res?.data || null);
        setValue(res?.data?.pro_price ? centimesToInput(res.data.pro_price) : "");
      })
      .catch(() => active && setPart(null));
    return () => {
      active = false;
    };
  }, [partId]);

  async function save(next) {
    setState({ saving: true, error: "", saved: false });
    try {
      const cents = next === null ? null : parseMoneyInput(next);
      if (cents !== null && !(cents > 0)) throw new Error(t("Enter an amount, e.g. 85 or 85.50"));
      await api.put(`/api/v1/marketplace/me/parts/${partId}/pro-price`, { pro_price: cents });
      if (cents === null) setValue("");
      setState({ saving: false, error: "", saved: true });
    } catch (err) {
      setState({ saving: false, error: err?.message || t("Something went wrong. Please try again."), saved: false });
    }
  }

  if (!part) return null;
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">{t("Pro price (garages, mechanics)")}</h3>
      <p className="mt-1 text-xs text-gray-500">
        {t("Optional. Lower than your price ({price}). Only professional buyers approved by PartHub see and pay it.", { price: formatMoney(part.price) })}
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold text-gray-800">
          {t("Pro price (MAD)")}
          <input
            value={value}
            onChange={(e) => { setValue(e.target.value); setState((s) => ({ ...s, saved: false })); }}
            inputMode="decimal"
            dir="ltr"
            className="mt-1 h-11 w-40 rounded-xl border border-gray-300 px-3 text-sm text-gray-900"
            aria-describedby="pro-price-help"
          />
        </label>
        <button type="button" disabled={state.saving || !value.trim()} onClick={() => save(value)} className="h-11 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
          {t("Save pro price")}
        </button>
        {part.pro_price || value ? (
          <button type="button" disabled={state.saving} onClick={() => save(null)} className="h-11 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            {t("Remove")}
          </button>
        ) : null}
      </div>
      <p id="pro-price-help" className="sr-only">{t("Pro price (garages, mechanics)")}</p>
      {state.saved ? <p className="mt-2 text-sm text-emerald-700" role="status">{t("Saved")}</p> : null}
      {state.error ? <p className="mt-2 text-sm text-red-700" role="alert">{state.error}</p> : null}
    </section>
  );
}
