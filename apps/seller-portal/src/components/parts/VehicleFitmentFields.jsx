import { useState } from "react";
import { api } from "../../lib/api";
import { loadEngines, loadGenerations, loadMakes, loadModels, useCatalogList, yearsLabel } from "../../lib/vehicleCatalog";
import { useT } from "../../i18n";

// One vehicle a part fits, picked from PartHub's catalog:
// make → model → generation (fills the years) → engine (optional) → years.
// value: { make, make_slug, model, model_slug, generation_id, generation, engine_id, engine, year_start, year_end }

const inputCls =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400";
const labelCls = "mb-1 block text-xs font-semibold text-gray-700";

export const EMPTY_FITMENT = {
  make: "", make_slug: "", model: "", model_slug: "", generation_id: "", generation: "", engine_id: "", engine: "", year_start: "", year_end: "",
};

export default function VehicleFitmentFields({ value, onChange, idPrefix = "fit" }) {
  const t = useT();
  const makes = useCatalogList(loadMakes, "all");
  const models = useCatalogList(loadModels, value.make_slug);
  const generations = useCatalogList(loadGenerations, value.make_slug, value.model_slug);
  const engines = useCatalogList(loadEngines, value.generation_id);
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label htmlFor={`${idPrefix}-make`} className={labelCls}>{t("Make")}</label>
        <select
          id={`${idPrefix}-make`}
          value={value.make_slug}
          onChange={(e) => {
            const m = makes.find((x) => x.slug === e.target.value);
            set({ ...EMPTY_FITMENT, make: m?.name || "", make_slug: m?.slug || "" });
          }}
          className={inputCls}
        >
          <option value="">{t("Select make")}</option>
          {makes.map((m) => <option key={m.id} value={m.slug}>{m.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-model`} className={labelCls}>{t("Model")}</label>
        <select
          id={`${idPrefix}-model`}
          value={value.model_slug}
          disabled={!value.make_slug}
          onChange={(e) => {
            const m = models.find((x) => x.slug === e.target.value);
            set({ model: m?.name || "", model_slug: m?.slug || "", generation_id: "", generation: "", engine_id: "", engine: "", year_start: "", year_end: "" });
          }}
          className={inputCls}
        >
          <option value="">{value.make_slug ? t("Select model") : t("Choose make first")}</option>
          {models.map((m) => <option key={m.id} value={m.slug}>{m.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-gen`} className={labelCls}>{t("Generation")}</label>
        <select
          id={`${idPrefix}-gen`}
          value={value.generation_id}
          disabled={!value.model_slug || !generations.length}
          onChange={(e) => {
            const g = generations.find((x) => String(x.id) === e.target.value);
            set({
              generation_id: g ? String(g.id) : "",
              generation: g?.name || "",
              engine_id: "",
              engine: "",
              year_start: g ? String(g.year_start) : value.year_start,
              year_end: g ? String(g.year_end || new Date().getFullYear()) : value.year_end,
            });
          }}
          className={inputCls}
        >
          <option value="">{value.model_slug && !generations.length ? t("No generations yet") : t("Select generation")}</option>
          {generations.map((g) => <option key={g.id} value={g.id}>{g.name} ({yearsLabel(g.year_start, g.year_end)})</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-engine`} className={labelCls}>{t("Engine")}</label>
        <select
          id={`${idPrefix}-engine`}
          value={value.engine_id}
          disabled={!value.generation_id}
          onChange={(e) => {
            const en = engines.find((x) => String(x.id) === e.target.value);
            set({ engine_id: en ? String(en.id) : "", engine: en?.name || "" });
          }}
          className={inputCls}
        >
          <option value="">{value.generation_id ? t("All engines") : t("Choose generation first")}</option>
          {engines.map((en) => <option key={en.id} value={en.id}>{en.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-from`} className={labelCls}>{t("From")}</label>
        <input id={`${idPrefix}-from`} inputMode="numeric" dir="ltr" value={value.year_start} onChange={(e) => set({ year_start: e.target.value.replace(/\D/g, "").slice(0, 4) })} className={inputCls} placeholder="2013" />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-to`} className={labelCls}>{t("To")}</label>
        <input id={`${idPrefix}-to`} inputMode="numeric" dir="ltr" value={value.year_end} onChange={(e) => set({ year_end: e.target.value.replace(/\D/g, "").slice(0, 4) })} className={inputCls} placeholder="2019" />
      </div>
    </div>
  );
}

// "Renault Clio IV · 1.5 dCi 90 · 2012–2019"
export function fitmentLabel(row) {
  const name = [row.make, row.generation || row.model].filter(Boolean).join(" ");
  const years = yearsLabel(Number(row.year_start) || null, Number(row.year_end) || null);
  return [name, row.engine, years].filter(Boolean).join(" · ");
}

// The API body for a fitment row.
export function fitmentPayload(row) {
  const ys = Number(row.year_start) || null;
  return {
    make: row.make,
    model: row.model,
    ...(row.generation_id ? { generation_id: Number(row.generation_id) } : {}),
    ...(row.engine_id ? { engine_id: Number(row.engine_id) } : {}),
    year_start: ys,
    year_end: row.year_end ? Number(row.year_end) : ys,
  };
}

// "Can't find it? Suggest it to PartHub" — a missing vehicle or part brand.
export function SuggestCatalogEntry({ kind = "vehicle", initial = {} }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ make: "", model: "", generation: "", year_start: "", year_end: "", engine: "", brand: "", note: "", ...initial });
  const [state, setState] = useState({ saving: false, error: "", sent: false });
  const field = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function send() {
    setState({ saving: true, error: "", sent: false });
    try {
      await api.post("/api/v1/marketplace/me/catalog-suggestions", { kind, ...form });
      setState({ saving: false, error: "", sent: true });
      setOpen(false);
    } catch (err) {
      setState({ saving: false, error: err?.message || t("Something went wrong. Please try again."), sent: false });
    }
  }

  if (state.sent) {
    return <p className="text-xs font-semibold text-emerald-700" role="status">{t("Thanks! PartHub will review your suggestion. It appears in the lists once approved.")}</p>;
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-blue-700 hover:underline">
        {kind === "brand" ? t("Brand not in the list? Suggest it") : t("Vehicle, generation or engine missing? Suggest it")}
      </button>
    );
  }
  const small = "h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-500";
  return (
    <div className="space-y-2 rounded-2xl border border-blue-200 bg-blue-50/40 p-3">
      <p className="text-sm font-semibold text-gray-900">{kind === "brand" ? t("Suggest a part brand") : t("Suggest a vehicle")}</p>
      {kind === "brand" ? (
        <input value={form.brand} onChange={field("brand")} placeholder={t("Brand name")} className={small} aria-label={t("Brand name")} />
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          <input value={form.make} onChange={field("make")} placeholder={t("Make (e.g. Renault)")} aria-label={t("Make")} className={small} />
          <input value={form.model} onChange={field("model")} placeholder={t("Model (e.g. Clio)")} aria-label={t("Model")} className={small} />
          <input value={form.generation} onChange={field("generation")} placeholder={t("Generation (e.g. Clio IV)")} aria-label={t("Generation")} className={small} />
          <input value={form.year_start} onChange={field("year_start")} inputMode="numeric" dir="ltr" placeholder={t("From (year)")} aria-label={t("From")} className={small} />
          <input value={form.year_end} onChange={field("year_end")} inputMode="numeric" dir="ltr" placeholder={t("To (year, empty if still sold)")} aria-label={t("To")} className={small} />
          <input value={form.engine} onChange={field("engine")} placeholder={t("Engine (e.g. 1.5 dCi 90)")} aria-label={t("Engine")} className={small} />
        </div>
      )}
      <input value={form.note} onChange={field("note")} placeholder={t("Note for PartHub (optional)")} aria-label={t("Note for PartHub (optional)")} className={small} />
      {state.error ? <p className="text-xs text-red-700" role="alert">{state.error}</p> : null}
      <div className="flex gap-2">
        <button type="button" onClick={send} disabled={state.saving} className="h-9 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300">
          {state.saving ? t("Sending…") : t("Send suggestion")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-xl px-3 text-sm font-semibold text-gray-600 hover:bg-gray-100">{t("Cancel")}</button>
      </div>
    </div>
  );
}
