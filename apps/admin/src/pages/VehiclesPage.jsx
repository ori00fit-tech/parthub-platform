import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useT } from "../i18n";
import { notifyPendingChanged } from "../lib/pending";

// PartHub's vehicle catalog: makes → models → generations → engines.
// Sellers pick fitment from it; their suggestions for missing entries wait
// here for approval. Admins can also add, correct and delete entries.

const card = "rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm";
const input = "h-10 w-full rounded-xl border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100 outline-none focus:border-blue-500";
const btn = "h-9 rounded-xl px-3 text-sm font-semibold transition disabled:opacity-50";
const yearsLabel = (a, b) => (a ? (b ? `${a}–${b}` : `${a} →`) : "");

// Data quality (migrations/0018): where a row comes from and whether it was checked.
const VERIFICATION_STYLE = {
  verified: "border-emerald-700 text-emerald-300",
  admin_approved: "border-blue-700 text-blue-300",
  unverified: "border-amber-700 text-amber-300",
};
const VERIFICATION_LABEL = { verified: "Verified", admin_approved: "Approved", unverified: "Unverified" };
const SOURCE_LABEL = { seed: "Initial list", seed_parthub: "PartHub list", admin: "Added by admin", seller_suggestion: "Seller suggestion", imported: "Imported" };

function Verification({ value, source }) {
  const t = useT();
  const v = value || "unverified";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${VERIFICATION_STYLE[v] || VERIFICATION_STYLE.unverified}`} title={source ? t(SOURCE_LABEL[source] || source) : undefined}>
      {t(VERIFICATION_LABEL[v] || v)}
    </span>
  );
}

function Suggestion({ item, onDone }) {
  const t = useT();
  const [fields, setFields] = useState({
    make: item.make || "", model: item.model || "", generation: item.generation || "",
    year_start: item.year_start || "", year_end: item.year_end || "", engine: item.engine || "", brand: item.brand || "",
  });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const f = (k) => (e) => setFields((x) => ({ ...x, [k]: e.target.value }));

  async function decide(action) {
    setBusy(action);
    setError("");
    try {
      await api.post(`/api/v1/admin/catalog-suggestions/${item.id}/${action}`, action === "approve" ? { ...fields, admin_note: note } : { admin_note: note });
      notifyPendingChanged();
      onDone();
    } catch (err) {
      setError(err?.message || t("Something went wrong. Please try again."));
    } finally {
      setBusy("");
    }
  }

  return (
    <article className="rounded-2xl border border-gray-800 bg-gray-950 p-4">
      <p className="text-xs text-gray-500">
        {item.kind === "brand" ? t("Part brand") : t("Vehicle")} · {item.seller_name || item.user_name} ({item.user_email})
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {item.kind === "brand" ? (
          <input value={fields.brand} onChange={f("brand")} className={input} aria-label={t("Brand name")} />
        ) : (
          <>
            <input value={fields.make} onChange={f("make")} className={input} placeholder={t("Make")} aria-label={t("Make")} />
            <input value={fields.model} onChange={f("model")} className={input} placeholder={t("Model")} aria-label={t("Model")} />
            <input value={fields.generation} onChange={f("generation")} className={input} placeholder={t("Generation")} aria-label={t("Generation")} />
            <input value={fields.year_start} onChange={f("year_start")} className={input} placeholder={t("From")} aria-label={t("From")} inputMode="numeric" dir="ltr" />
            <input value={fields.year_end} onChange={f("year_end")} className={input} placeholder={t("To")} aria-label={t("To")} inputMode="numeric" dir="ltr" />
            <input value={fields.engine} onChange={f("engine")} className={input} placeholder={t("Engine")} aria-label={t("Engine")} />
          </>
        )}
      </div>
      {item.note ? <p className="mt-2 text-sm text-gray-300">“{item.note}”</p> : null}
      <input value={note} onChange={(e) => setNote(e.target.value)} className={`${input} mt-2`} placeholder={t("Note to the seller (optional)")} aria-label={t("Note to the seller (optional)")} />
      {error ? <p className="mt-2 text-sm text-red-400" role="alert">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => decide("approve")} disabled={Boolean(busy)} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-500`}>
          {busy === "approve" ? t("Saving…") : t("Approve and add")}
        </button>
        <button type="button" onClick={() => decide("reject")} disabled={Boolean(busy)} className={`${btn} border border-gray-700 text-gray-300 hover:bg-gray-800`}>
          {t("Reject")}
        </button>
      </div>
    </article>
  );
}

function Generation({ gen, onChange }) {
  const t = useT();
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState("");

  async function run(fn) {
    setError("");
    try {
      await fn();
      onChange();
    } catch (err) {
      setError(err?.message || t("Something went wrong. Please try again."));
    }
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950 p-4">
      {edit ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_90px_90px_auto]">
          <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={input} aria-label={t("Generation")} />
          <input value={edit.year_start} onChange={(e) => setEdit({ ...edit, year_start: e.target.value })} className={input} aria-label={t("From")} dir="ltr" />
          <input value={edit.year_end ?? ""} onChange={(e) => setEdit({ ...edit, year_end: e.target.value })} className={input} aria-label={t("To")} placeholder="→" dir="ltr" />
          <div className="flex gap-2">
            <button type="button" className={`${btn} bg-blue-600 text-white`} onClick={() => run(async () => {
              await api.patch(`/api/v1/admin/vehicles/generations/${gen.id}`, { name: edit.name, year_start: Number(edit.year_start), year_end: edit.year_end === "" ? null : Number(edit.year_end) });
              setEdit(null);
            })}>{t("Save")}</button>
            <button type="button" className={`${btn} text-gray-400`} onClick={() => setEdit(null)}>{t("Cancel")}</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-gray-100">
            {gen.name} <span className="font-normal text-gray-400">· {yearsLabel(gen.year_start, gen.year_end)}</span>
            <Verification value={gen.verification} source={gen.source} />
            <span className="text-xs font-normal text-gray-500">{t("{n} fitment rows", { n: gen.fitment_count || 0 })}</span>
          </p>
          <div className="flex gap-1">
            {gen.verification !== "verified" ? (
              <button type="button" className={`${btn} text-emerald-300 hover:bg-gray-800`} onClick={() => run(() => api.patch(`/api/v1/admin/vehicles/generations/${gen.id}`, { verification: "verified" }))}>
                {t("Mark verified")}
              </button>
            ) : null}
            <button type="button" className={`${btn} text-blue-300 hover:bg-gray-800`} onClick={() => setEdit({ name: gen.name, year_start: gen.year_start, year_end: gen.year_end ?? "" })}>{t("Edit")}</button>
            <button type="button" className={`${btn} text-red-300 hover:bg-gray-800`} onClick={() => {
              if (window.confirm(t("Delete {name} and its engines? Parts keep their fitment text.", { name: gen.name }))) {
                run(() => api.delete(`/api/v1/admin/vehicles/generations/${gen.id}`));
              }
            }}>{t("Delete")}</button>
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {gen.engines.map((en) => (
          <span key={en.id} className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-200">
            {en.name}
            <span className="text-gray-500">· {t(en.fuel || "petrol")}</span>
            {en.verification === "verified" ? (
              <span className="text-emerald-300" title={t("Verified")}>✓</span>
            ) : (
              <button type="button" className="text-amber-300" title={en.specs_inferred ? t("Fuel, size and power read from the name, not checked") : t("Unverified")} aria-label={t("Mark {name} as verified", { name: en.name })} onClick={() => {
                if (window.confirm(t("Mark {name} as verified? Fuel, size and power will count as checked.", { name: en.name }))) {
                  run(() => api.patch(`/api/v1/admin/vehicles/engines/${en.id}`, { verification: "verified" }));
                }
              }}>?</button>
            )}
            <button type="button" aria-label={t("Rename {name}", { name: en.name })} className="ms-1 text-blue-300" onClick={() => {
              const name = window.prompt(t("Engine name"), en.name);
              if (name && name.trim() && name.trim() !== en.name) run(() => api.patch(`/api/v1/admin/vehicles/engines/${en.id}`, { name: name.trim() }));
            }}>✎</button>
            <button type="button" aria-label={t("Delete {name}", { name: en.name })} className="text-red-300" onClick={() => {
              if (window.confirm(t("Delete the engine {name}?", { name: en.name }))) run(() => api.delete(`/api/v1/admin/vehicles/engines/${en.id}`));
            }}>×</button>
          </span>
        ))}
        {!gen.engines.length ? <span className="text-xs text-gray-500">{t("No engines yet.")}</span> : null}
      </div>
      {error ? <p className="mt-2 text-sm text-red-400" role="alert">{error}</p> : null}
    </div>
  );
}

export default function VehiclesPage() {
  const t = useT();
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [make, setMake] = useState("");
  const [modelId, setModelId] = useState("");
  const [generations, setGenerations] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [form, setForm] = useState({ make: "", model: "", generation: "", year_start: "", year_end: "", engine: "" });
  const [formState, setFormState] = useState({ busy: false, error: "", ok: "" });
  const [error, setError] = useState("");

  const loadMakes = useCallback(() => api.get("/api/v1/vehicles/makes").then((r) => setMakes(r?.data || [])).catch((e) => setError(e?.message || "")), []);
  const loadSuggestions = useCallback(() => api.get("/api/v1/admin/catalog-suggestions").then((r) => setSuggestions(r?.data || [])).catch(() => setSuggestions([])), []);
  const loadModels = useCallback((slug) => (slug ? api.get(`/api/v1/vehicles/models?make=${encodeURIComponent(slug)}`).then((r) => setModels(r?.data || [])) : Promise.resolve(setModels([]))), []);
  const loadGenerations = useCallback((id) => (id ? api.get(`/api/v1/admin/vehicles/generations?model_id=${id}`).then((r) => setGenerations(r?.data || [])) : Promise.resolve(setGenerations([]))), []);

  useEffect(() => {
    loadMakes();
    loadSuggestions();
  }, [loadMakes, loadSuggestions]);
  useEffect(() => {
    setModelId("");
    loadModels(make);
  }, [make, loadModels]);
  useEffect(() => {
    loadGenerations(modelId);
  }, [modelId, loadGenerations]);

  // Pre-fill the "add" form with the make and model being viewed.
  useEffect(() => {
    const mk = makes.find((m) => m.slug === make);
    const md = models.find((m) => String(m.id) === String(modelId));
    setForm((f) => ({ ...f, make: mk?.name || f.make, model: md?.name || (mk ? "" : f.model) }));
  }, [make, modelId, makes, models]);

  async function addToCatalog(e) {
    e.preventDefault();
    setFormState({ busy: true, error: "", ok: "" });
    try {
      await api.post("/api/v1/admin/vehicles/catalog", {
        ...form,
        year_start: form.year_start ? Number(form.year_start) : null,
        year_end: form.year_end ? Number(form.year_end) : null,
      });
      setFormState({ busy: false, error: "", ok: t("Saved to the catalog.") });
      setForm((f) => ({ ...f, engine: "" }));
      await Promise.all([loadMakes(), loadModels(make), loadGenerations(modelId)]);
    } catch (err) {
      setFormState({ busy: false, error: err?.message || t("Something went wrong. Please try again."), ok: "" });
    }
  }

  const f = (k) => (e) => setForm((x) => ({ ...x, [k]: e.target.value }));

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-gray-800 bg-gradient-to-br from-gray-900 via-slate-950 to-blue-950 p-6 text-white shadow-xl sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">{t("Vehicle catalog")}</h1>
        <p className="mt-3 max-w-3xl text-sm text-gray-300 sm:text-base">
          {t("Makes, models, generations and engines that sellers choose from when they say which vehicles a part fits.")}
        </p>
        <p className="mt-2 max-w-3xl text-xs text-amber-200">
          {t("The initial list was compiled by PartHub and is not verified yet. Check generations and engines against a reliable source, then mark them verified.")}
        </p>
      </div>

      {error ? <div className="rounded-3xl border border-red-900/50 bg-red-950/20 p-4 text-red-300">{error}</div> : null}

      <div className={card}>
        <h2 className="text-xl font-bold text-gray-100">{t("Suggestions from sellers")} <span className="text-gray-500">({suggestions.length})</span></h2>
        <p className="mt-1 text-sm text-gray-400">{t("Correct the spelling if needed, then approve: it becomes selectable for every seller.")}</p>
        <div className="mt-4 space-y-3">
          {suggestions.length ? suggestions.map((s) => <Suggestion key={s.id} item={s} onDone={() => (loadSuggestions(), loadMakes())} />) : <p className="text-sm text-gray-500">{t("No suggestion waiting.")}</p>}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className={card}>
          <h2 className="text-xl font-bold text-gray-100">{t("Browse and correct")}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select value={make} onChange={(e) => setMake(e.target.value)} className={input} aria-label={t("Make")}>
              <option value="">{t("Select make")}</option>
              {makes.map((m) => <option key={m.id} value={m.slug}>{m.name}</option>)}
            </select>
            <select value={modelId} onChange={(e) => setModelId(e.target.value)} disabled={!make} className={input} aria-label={t("Model")}>
              <option value="">{make ? t("Select model") : t("Choose make first")}</option>
              {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="mt-4 space-y-3">
            {modelId && !generations.length ? <p className="text-sm text-gray-500">{t("No generations for this model yet. Add one with the form.")}</p> : null}
            {generations.map((g) => <Generation key={g.id} gen={g} onChange={() => loadGenerations(modelId)} />)}
          </div>
        </div>

        <form onSubmit={addToCatalog} className={`${card} space-y-3`}>
          <h2 className="text-xl font-bold text-gray-100">{t("Add to the catalog")}</h2>
          <p className="text-sm text-gray-400">{t("Fill what is missing: an existing make, model or generation with the same name is reused.")}</p>
          <input value={form.make} onChange={f("make")} className={input} placeholder={t("Make (e.g. Renault)")} aria-label={t("Make")} />
          <input value={form.model} onChange={f("model")} className={input} placeholder={t("Model (e.g. Clio)")} aria-label={t("Model")} />
          <input value={form.generation} onChange={f("generation")} className={input} placeholder={t("Generation (e.g. Clio IV)")} aria-label={t("Generation")} />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.year_start} onChange={f("year_start")} className={input} placeholder={t("From (year)")} aria-label={t("From")} inputMode="numeric" dir="ltr" />
            <input value={form.year_end} onChange={f("year_end")} className={input} placeholder={t("To (year, empty if still sold)")} aria-label={t("To")} inputMode="numeric" dir="ltr" />
          </div>
          <input value={form.engine} onChange={f("engine")} className={input} placeholder={t("Engine (e.g. 1.5 dCi 90)")} aria-label={t("Engine")} />
          {formState.error ? <p className="text-sm text-red-400" role="alert">{formState.error}</p> : null}
          {formState.ok ? <p className="text-sm text-emerald-400" role="status">{formState.ok}</p> : null}
          <button type="submit" disabled={formState.busy} className={`${btn} h-10 bg-blue-600 px-5 text-white hover:bg-blue-500`}>
            {formState.busy ? t("Saving…") : t("Save to the catalog")}
          </button>
        </form>
      </div>
    </section>
  );
}
