import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useT } from "../../i18n";

// Edit page: a part too big or heavy to ship (engine, gearbox, door...)
// is sold for pickup at the store only (PUT /me/parts/:id/fulfillment).
export default function PickupOnlyToggle({ partId }) {
  const t = useT();
  const [pickupOnly, setPickupOnly] = useState(null);
  const [state, setState] = useState({ saving: false, error: "" });

  useEffect(() => {
    let active = true;
    api
      .get(`/api/v1/marketplace/me/parts/${partId}`)
      .then((res) => active && setPickupOnly(Number(res?.data?.delivery_available ?? 1) === 0))
      .catch(() => active && setPickupOnly(false));
    return () => {
      active = false;
    };
  }, [partId]);

  async function toggle(next) {
    setState({ saving: true, error: "" });
    try {
      await api.put(`/api/v1/marketplace/me/parts/${partId}/fulfillment`, { delivery_available: !next });
      setPickupOnly(next);
      setState({ saving: false, error: "" });
    } catch (err) {
      setState({ saving: false, error: err?.message || t("Something went wrong. Please try again.") });
    }
  }

  if (pickupOnly == null) return null;
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={pickupOnly} disabled={state.saving} onChange={(e) => toggle(e.target.checked)} className="mt-1 h-4 w-4" />
        <span>
          <span className="block text-sm font-semibold text-gray-900">{t("Pickup only")}</span>
          <span className="block text-xs text-gray-500">
            {t("Too big or heavy to ship (engine, gearbox, door...). Buyers collect it at your store: turn on pickup in your store settings.")}
          </span>
        </span>
      </label>
      {state.error ? <p className="mt-2 text-sm text-red-700" role="alert">{state.error}</p> : null}
    </section>
  );
}
