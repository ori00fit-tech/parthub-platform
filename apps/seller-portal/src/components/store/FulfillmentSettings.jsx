import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useT } from "../../i18n";

// How buyers can get this store's parts: delivery and/or pickup at the
// store (API: PUT /api/v1/marketplace/me/fulfillment, utils/pickup.ts).
export default function FulfillmentSettings() {
  const t = useT();
  const [value, setValue] = useState(null);
  const [state, setState] = useState({ saving: false, error: "", ok: "" });

  useEffect(() => {
    let active = true;
    api
      .get("/api/v1/marketplace/me")
      .then((res) => {
        if (!active) return;
        const s = res?.data || {};
        setValue({
          delivery_enabled: s.delivery_enabled == null ? true : Boolean(Number(s.delivery_enabled)),
          pickup_enabled: Boolean(Number(s.pickup_enabled)),
          pickup_address: s.pickup_address || "",
          pickup_hours: s.pickup_hours || "",
          // centimes → MAD text; empty = PartHub's standard fee
          delivery_fee_local: s.delivery_fee_local == null ? "" : String(Number(s.delivery_fee_local) / 100),
          delivery_fee_national: s.delivery_fee_national == null ? "" : String(Number(s.delivery_fee_national) / 100),
          city: s.location || s.city || "",
        });
      })
      .catch((err) => active && setState((x) => ({ ...x, error: err?.message || "" })));
    return () => {
      active = false;
    };
  }, []);

  async function save(e) {
    e.preventDefault();
    setState({ saving: true, error: "", ok: "" });
    try {
      const { city, ...payload } = value; // eslint-disable-line no-unused-vars
      await api.put("/api/v1/marketplace/me/fulfillment", payload);
      setState({ saving: false, error: "", ok: t("Saved.") });
    } catch (err) {
      setState({ saving: false, error: err?.message || t("Something went wrong. Please try again."), ok: "" });
    }
  }

  if (!value) return <div className="h-40 animate-pulse rounded-3xl border border-gray-200 bg-white" />;
  const set = (patch) => (setValue((v) => ({ ...v, ...patch })), setState((x) => ({ ...x, ok: "" })));

  return (
    <form onSubmit={save} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="fulfil-title">
      <h2 id="fulfil-title" className="text-xl font-bold text-gray-900">{t("How buyers get their parts")}</h2>
      <p className="mt-1 text-sm text-gray-500">{t("Offer delivery, pickup at your store, or both. Buyers choose at checkout.")}</p>

      <div className="mt-5 space-y-3">
        <div className="rounded-2xl border border-gray-200 p-4">
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={value.delivery_enabled} onChange={(e) => set({ delivery_enabled: e.target.checked })} className="mt-1 h-4 w-4" />
            <span>
              <span className="block text-sm font-semibold text-gray-900">{t("Delivery")}</span>
              <span className="block text-xs text-gray-500">{t("You ship the parts with your delivery company or driver. The buyer pays cash on delivery.")}</span>
            </span>
          </label>
          {value.delivery_enabled ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="fee-local" className="mb-1 block text-sm font-semibold text-gray-800">
                  {value.city ? t("Delivery fee in {city} (MAD)", { city: value.city.split(",")[0] }) : t("Delivery fee in your city (MAD)")}
                </label>
                <input
                  id="fee-local"
                  inputMode="decimal"
                  value={value.delivery_fee_local}
                  onChange={(e) => set({ delivery_fee_local: e.target.value })}
                  placeholder="35"
                  className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="fee-national" className="mb-1 block text-sm font-semibold text-gray-800">{t("Delivery fee to other cities (MAD)")}</label>
                <input
                  id="fee-national"
                  inputMode="decimal"
                  value={value.delivery_fee_national}
                  onChange={(e) => set({ delivery_fee_national: e.target.value })}
                  placeholder="35"
                  className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 sm:col-span-2">
                {t("You collect this fee from the buyer with the parts. Empty = PartHub's standard fee (35 MAD). 0 = free delivery.")}
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-gray-200 p-4">
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={value.pickup_enabled} onChange={(e) => set({ pickup_enabled: e.target.checked })} className="mt-1 h-4 w-4" />
            <span>
              <span className="block text-sm font-semibold text-gray-900">{t("Pickup at my store")}</span>
              <span className="block text-xs text-gray-500">
                {t("You keep the part 3 days. The buyer (or someone they send) inspects it, pays you and gives a 6-digit code that closes the order.")}
              </span>
            </span>
          </label>
          {value.pickup_enabled ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="pickup-address" className="mb-1 block text-sm font-semibold text-gray-800">{t("Pickup address")}</label>
                <input
                  id="pickup-address"
                  value={value.pickup_address}
                  onChange={(e) => set({ pickup_address: e.target.value })}
                  maxLength={300}
                  placeholder={t("e.g. 12 Rue des Casses, Hay Hassani, near the mosque")}
                  className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="pickup-hours" className="mb-1 block text-sm font-semibold text-gray-800">{t("Opening hours (optional)")}</label>
                <input
                  id="pickup-hours"
                  value={value.pickup_hours}
                  onChange={(e) => set({ pickup_hours: e.target.value })}
                  maxLength={200}
                  placeholder={t("e.g. Mon–Sat 9:00–19:00")}
                  className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {state.error ? <p className="mt-3 text-sm text-red-700" role="alert">{state.error}</p> : null}
      {state.ok ? <p className="mt-3 text-sm text-emerald-700" role="status">{state.ok}</p> : null}
      <button type="submit" disabled={state.saving} className="mt-4 h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300">
        {state.saving ? t("Saving…") : t("Save")}
      </button>
    </form>
  );
}
