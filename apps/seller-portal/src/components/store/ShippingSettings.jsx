import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useT } from "../../i18n";

// My carriers and shipping choices (API: GET/PUT /api/v1/marketplace/me/shipping,
// utils/carriers.ts and utils/shipping.ts): the delivery companies I work
// with (my customer number there, the one I use by default — offered first
// when I ship), free delivery from an amount, and my delivery times (shown
// to buyers on the part page and at checkout).
const field = "h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500";

export default function ShippingSettings() {
  const t = useT();
  const [value, setValue] = useState(null);
  const [state, setState] = useState({ saving: false, error: "", ok: "" });

  const fromApi = (d) => ({
    carriers: (d?.carriers || []).map((c) => ({ ...c, account_ref: c.account_ref || "" })),
    default_carrier: (d?.carriers || []).find((c) => c.is_default)?.code || "",
    free_delivery_over: d?.free_delivery_over == null ? "" : String(Number(d.free_delivery_over) / 100),
    delivery_days_local: d?.delivery_days_local == null ? "" : String(d.delivery_days_local),
    delivery_days_national: d?.delivery_days_national == null ? "" : String(d.delivery_days_national),
  });

  useEffect(() => {
    api.get("/api/v1/marketplace/me/shipping").then((r) => setValue(fromApi(r?.data))).catch((err) => setState((s) => ({ ...s, error: err?.message || "" })));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setCarrier = (code, patch) =>
    setValue((v) => {
      const carriers = v.carriers.map((c) => (c.code === code ? { ...c, ...patch } : c));
      // The default must stay one of mine.
      const stillMine = carriers.some((c) => c.chosen && c.code === v.default_carrier);
      return { ...v, carriers, default_carrier: stillMine ? v.default_carrier : "" };
    });

  async function save(e) {
    e.preventDefault();
    setState({ saving: true, error: "", ok: "" });
    try {
      const mine = value.carriers.filter((c) => c.chosen);
      const res = await api.put("/api/v1/marketplace/me/shipping", {
        carriers: mine.map((c) => ({ code: c.code, account_ref: c.account_ref.trim() || null })),
        default_carrier: value.default_carrier || (mine.length === 1 ? mine[0].code : null),
        free_delivery_over: value.free_delivery_over,
        delivery_days_local: value.delivery_days_local,
        delivery_days_national: value.delivery_days_national,
      });
      setValue(fromApi(res?.data));
      setState({ saving: false, error: "", ok: t("Shipping saved") });
    } catch (err) {
      setState({ saving: false, error: err?.message || t("Something went wrong. Please try again."), ok: "" });
    }
  }

  if (!value) return <div className="h-40 animate-pulse rounded-3xl bg-white" />;
  const mine = value.carriers.filter((c) => c.chosen);
  return (
    <form onSubmit={save} className="space-y-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="shipping-title">
      <div>
        <h2 id="shipping-title" className="text-lg font-bold text-gray-900">{t("Shipping: my carriers and options")}</h2>
        <p className="mt-1 text-sm text-gray-600">{t("Tick the delivery companies you work with: they are offered first when you ship, your default one already selected.")}</p>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-gray-900">{t("My carriers")}</legend>
        <ul className="mt-2 divide-y divide-gray-100 rounded-2xl border border-gray-200">
          {value.carriers.map((c) => (
            <li key={c.code} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <label className="flex min-w-[12rem] flex-1 items-center gap-2 text-sm font-semibold text-gray-900">
                <input type="checkbox" checked={c.chosen} onChange={(e) => setCarrier(c.code, { chosen: e.target.checked })} className="h-5 w-5 accent-blue-600" />
                {c.code === "own" ? t("My own driver") : c.code === "other" ? t("Other carrier") : c.name}
              </label>
              {c.chosen && c.code !== "own" && c.code !== "other" ? (
                <input
                  value={c.account_ref}
                  onChange={(e) => setCarrier(c.code, { account_ref: e.target.value })}
                  maxLength={60}
                  dir="ltr"
                  placeholder={t("My customer number (optional)")}
                  aria-label={t("My customer number at {carrier}", { carrier: c.name })}
                  className="h-9 w-56 rounded-lg border border-gray-200 px-2 text-xs outline-none focus:border-blue-500"
                />
              ) : null}
              {c.chosen ? (
                <label className="flex items-center gap-1.5 text-xs text-gray-700">
                  <input type="radio" name="default-carrier" checked={value.default_carrier === c.code} onChange={() => setValue((v) => ({ ...v, default_carrier: c.code }))} className="accent-blue-600" />
                  {t("Default")}
                </label>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-gray-500">
          {mine.length ? t("{n} chosen.", { n: mine.length }) : t("None chosen: every carrier is offered when you ship.")}
        </p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-semibold text-gray-900">
          {t("Free delivery from (MAD)")}
          <input value={value.free_delivery_over} onChange={(e) => setValue((v) => ({ ...v, free_delivery_over: e.target.value }))} inputMode="decimal" placeholder={t("Never")} className={`${field} mt-1`} />
          <span className="mt-1 block text-xs font-normal text-gray-500">{t("When a buyer's parts from your store reach this amount, you deliver for free.")}</span>
        </label>
        <label className="block text-sm font-semibold text-gray-900">
          {t("Days to deliver in my city")}
          <input value={value.delivery_days_local} onChange={(e) => setValue((v) => ({ ...v, delivery_days_local: e.target.value }))} inputMode="numeric" placeholder="1" className={`${field} mt-1`} />
        </label>
        <label className="block text-sm font-semibold text-gray-900">
          {t("Days to deliver elsewhere in Morocco")}
          <input value={value.delivery_days_national} onChange={(e) => setValue((v) => ({ ...v, delivery_days_national: e.target.value }))} inputMode="numeric" placeholder="3" className={`${field} mt-1`} />
          <span className="mt-1 block text-xs font-normal text-gray-500">{t("Shown to buyers. Leave empty if you prefer not to say.")}</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={state.saving} className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300">
          {state.saving ? t("Saving…") : t("Save")}
        </button>
        {state.ok ? <span className="text-sm text-emerald-700" role="status">{state.ok}</span> : null}
        {state.error ? <span className="text-sm text-red-700" role="alert">{state.error}</span> : null}
      </div>
    </form>
  );
}
