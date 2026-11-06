import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useT } from "../../i18n";

// A listing's part numbers (OEM / aftermarket references — see
// workers/api/src/utils/part-numbers.ts).
//   value: { oem: ["7701 208 174", ...], maker: "439745" }
// OEM numbers are the part's own number for an original or used part, and
// "replaces" (the seller's claim) for an aftermarket part. The maker's
// number belongs to the brand chosen on the listing.

export const EMPTY_NUMBERS = { oem: [""], maker: "" };
const MAX_OEM = 6;

const inputCls = "h-11 w-full rounded-xl border border-gray-200 bg-white px-3 font-mono text-sm text-gray-900 outline-none focus:border-blue-500";

export function numbersPayload(value, { origin, brandId }) {
  const oemRole = origin === "aftermarket" ? "replaces" : "own";
  const list = (value?.oem || [])
    .map((n) => String(n || "").trim())
    .filter(Boolean)
    .map((number) => ({ number, kind: "oem", role: oemRole }));
  const maker = String(value?.maker || "").trim();
  if (maker) list.push({ number: maker, kind: "aftermarket", role: "own", ...(brandId ? { brand_id: Number(brandId) } : {}) });
  return list;
}

export function numbersFromApi(list) {
  const rows = Array.isArray(list) ? list : [];
  const oem = rows.filter((n) => n.kind === "oem").map((n) => n.number);
  const maker = rows.find((n) => n.kind === "aftermarket" && n.role === "own")?.number || "";
  return { oem: oem.length ? oem : [""], maker };
}

export default function PartNumbersFields({ value, onChange, origin, brandName, idPrefix = "num" }) {
  const t = useT();
  const oem = value?.oem?.length ? value.oem : [""];
  const setOem = (i, v) => onChange({ ...value, oem: oem.map((x, j) => (j === i ? v : x)) });
  const aftermarket = origin === "aftermarket";

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 block text-sm font-semibold text-gray-800">
          {aftermarket ? t("Original (OEM) numbers this part replaces") : t("Original (OEM) part number")}
        </p>
        <p className="mb-2 text-xs text-gray-500">
          {aftermarket
            ? t("The car maker's numbers this part replaces. Buyers searching an original number will find your part, shown as replacing it.")
            : t("The number on the part or its box (e.g. 7701 208 174). Spaces and dashes don't matter.")}
        </p>
        <div className="space-y-2">
          {oem.map((n, i) => (
            <div key={i} className="flex gap-2">
              <input
                id={`${idPrefix}-oem-${i}`}
                dir="ltr"
                value={n}
                onChange={(e) => setOem(i, e.target.value)}
                className={inputCls}
                placeholder="7701 208 174"
                aria-label={t("Original (OEM) part number")}
              />
              {oem.length > 1 ? (
                <button type="button" onClick={() => onChange({ ...value, oem: oem.filter((_, j) => j !== i) })} className="h-11 rounded-xl px-3 text-sm font-semibold text-red-700 hover:bg-red-50">
                  {t("Remove")}
                </button>
              ) : null}
            </div>
          ))}
        </div>
        {oem.length < MAX_OEM ? (
          <button type="button" onClick={() => onChange({ ...value, oem: [...oem, ""] })} className="mt-2 text-xs font-semibold text-blue-700 hover:underline">
            {t("+ Add another number")}
          </button>
        ) : null}
      </div>
      {aftermarket ? (
        <div>
          <label htmlFor={`${idPrefix}-maker`} className="mb-1 block text-sm font-semibold text-gray-800">
            {brandName ? t("{brand} part number", { brand: brandName }) : t("Parts maker's number")}
          </label>
          <input id={`${idPrefix}-maker`} dir="ltr" value={value?.maker || ""} onChange={(e) => onChange({ ...value, maker: e.target.value })} className={inputCls} placeholder="439745" />
          {!brandName ? <p className="mt-1 text-xs text-gray-500">{t("Choose the brand above so buyers know whose number it is.")}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

// Edit page: load, edit and save a listing's numbers.
export function PartNumbersEditor({ partId, origin, brandId, brandName }) {
  const t = useT();
  const [value, setValue] = useState(EMPTY_NUMBERS);
  const [state, setState] = useState({ loading: true, saving: false, error: "", ok: "" });

  useEffect(() => {
    let active = true;
    api
      .get(`/api/v1/marketplace/me/parts/${partId}/numbers`)
      .then((res) => active && (setValue(numbersFromApi(res?.data)), setState((s) => ({ ...s, loading: false }))))
      .catch((err) => active && setState((s) => ({ ...s, loading: false, error: err?.message || "" })));
    return () => {
      active = false;
    };
  }, [partId]);

  async function save() {
    setState((s) => ({ ...s, saving: true, error: "", ok: "" }));
    try {
      const res = await api.put(`/api/v1/marketplace/me/parts/${partId}/numbers`, { numbers: numbersPayload(value, { origin, brandId }) });
      setValue(numbersFromApi(res?.data));
      setState((s) => ({ ...s, saving: false, ok: t("Part numbers saved.") }));
    } catch (err) {
      setState((s) => ({ ...s, saving: false, error: err?.message || t("Something went wrong. Please try again.") }));
    }
  }

  return (
    <section id="numbers" className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">{t("Part numbers")}</h2>
      <p className="mt-1 text-sm text-gray-500">{t("Buyers often search by number. Listings with the same number are shown together so buyers can compare offers.")}</p>
      {state.loading ? (
        <div className="mt-4 h-24 animate-pulse rounded-2xl bg-gray-100" />
      ) : (
        <div className="mt-4 space-y-3">
          <PartNumbersFields value={value} onChange={setValue} origin={origin} brandName={brandName} idPrefix="edit-num" />
          {state.error ? <p className="text-sm text-red-700" role="alert">{state.error}</p> : null}
          {state.ok ? <p className="text-sm text-emerald-700" role="status">{state.ok}</p> : null}
          <button type="button" onClick={save} disabled={state.saving} className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300">
            {state.saving ? t("Saving…") : t("Save part numbers")}
          </button>
        </div>
      )}
    </section>
  );
}
