import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatMoney, parseMoneyInput } from "@parthub/shared";
import { api } from "../lib/api";
import { mediaUrl } from "../lib/requests";
import { uploadPartPhoto } from "../lib/photos";
import { useT } from "../i18n";
import { Icon } from "@parthub/shared/icons";

// Add a part in five short steps instead of one long form. The draft is kept
// on this device, so a seller on a phone can stop and come back.
const DRAFT_KEY = "ph_part_draft_v1";
const MAX_PHOTOS = 8;
const STEPS = ["The part", "Photos", "Price & stock", "Fits which vehicles", "Review"];

const EMPTY = {
  title: "",
  category_id: "",
  brand_id: "",
  condition: "used",
  part_origin: "aftermarket",
  sku: "",
  photos: [], // [{ url }]
  price: "",
  compare_price: "",
  quantity: 1,
  description: "",
  fitment: [], // [{ make, model, year_start, year_end }]
};

// Keyword → category name pattern (production names, e.g. "Brakes & Rotors").
const CATEGORY_HINTS = [
  [/brake|frein|plaquette|disque|فرامل|فحمات|ديسك/i, /brake/i],
  [/filt|huile|oil|فلتر|زيت/i, /filter|fluid/i],
  [/shock|amortiss|suspension|rotule|direction|steer|مخمد|تعليق|مقود/i, /suspension|steer/i],
  [/batter|alternat|starter|d[ée]marreur|phare|feu|light|lamp|bulb|دينامو|بطارية|ضوء|مصباح/i, /electric|light/i],
  [/radiat|refroid|thermostat|cool|water pump|ventilat|رادياتير|تبريد/i, /cool/i],
  [/exhaust|[ée]chappement|catalys|silencieux|عادم|كاتاليزور/i, /exhaust/i],
  [/gearbox|bo[iî]te|clutch|embrayage|transmission|cardan|vitesse|علبة السرعة|قابض|كاردان/i, /transmission|drivetrain/i],
  [/tire|tyre|pneu|jante|wheel|rim|إطار|عجلة|جنط/i, /tire|wheel/i],
  [/bumper|pare-?choc|r[ée]troviseur|mirror|capot|hood|porti[èe]re|door|aile|fender|grille|صدام|مرآة|باب|كابو/i, /body|exterior/i],
  [/engine|moteur|turbo|joint|courroie|belt|piston|culasse|injecteur|pump|pompe|محرك|توربو|حزام|مضخة/i, /engine/i],
  [/si[eè]ge|seat|tapis|mat|volant|dashboard|tableau|مقعد|طابلو/i, /interior|accessor/i],
];

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function Segmented({ value, onChange, options, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-1 rounded-2xl border border-gray-200 bg-gray-50 p-1">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={[
            "h-11 rounded-xl text-sm font-semibold transition",
            value === v ? "bg-blue-600 text-white shadow-sm" : "text-gray-700 hover:bg-white",
          ].join(" ")}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function Field({ label, hint, children, htmlFor }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-gray-800">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

const inputCls =
  "h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500";

export default function PartWizardPage() {
  const t = useT();
  const navigate = useNavigate();
  const [form, setForm] = useState(readDraft);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState({}); // make slug -> [{name, slug}]
  const [uploads, setUploads] = useState([]); // in-progress: [{ id, name, status, error }]
  const [publishing, setPublishing] = useState(false);
  const [done, setDone] = useState(null); // { id, title, status, warnings }
  const fileRef = useRef(null);
  const topRef = useRef(null);

  // Keep the draft on this device.
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      // ignore
    }
  }, [form]);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/api/v1/catalog/categories").catch(() => null),
      api.get("/api/v1/catalog/brands").catch(() => null),
      api.get("/api/v1/vehicles/makes").catch(() => null),
    ]).then(([c, b, m]) => {
      if (!active) return;
      setCategories(Array.isArray(c?.data) ? c.data : []);
      setBrands(Array.isArray(b?.data) ? b.data : []);
      setMakes(Array.isArray(m?.data) ? m.data : []);
    });
    return () => {
      active = false;
    };
  }, []);

  const set = (key) => (value) => {
    setError("");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const suggestedCategory = useMemo(() => {
    if (!form.title.trim() || !categories.length) return null;
    for (const [words, catPattern] of CATEGORY_HINTS) {
      if (!words.test(form.title)) continue;
      const match = categories.find((c) => catPattern.test(`${c.name} ${c.slug}`));
      if (match) return match;
    }
    return null;
  }, [form.title, categories]);

  const suggestedBrand = useMemo(() => {
    const title = form.title.toLowerCase();
    if (!title || !brands.length) return null;
    return brands.find((b) => b.name && new RegExp(`\\b${b.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(title)) || null;
  }, [form.title, brands]);

  function categoryName(id) {
    const c = categories.find((x) => String(x.id) === String(id));
    return c ? t(c.name) : "";
  }

  async function loadModels(makeName) {
    const make = makes.find((m) => m.name === makeName);
    if (!make || models[make.slug]) return;
    try {
      const res = await api.get(`/api/v1/vehicles/models?make=${encodeURIComponent(make.slug)}`);
      setModels((prev) => ({ ...prev, [make.slug]: Array.isArray(res?.data) ? res.data : [] }));
    } catch {
      setModels((prev) => ({ ...prev, [make.slug]: [] }));
    }
  }

  function modelsFor(makeName) {
    const make = makes.find((m) => m.name === makeName);
    return make ? models[make.slug] || [] : [];
  }

  // ---------- photos ----------
  async function addPhotos(fileList) {
    setError("");
    const room = MAX_PHOTOS - form.photos.length - uploads.filter((u) => u.status === "uploading").length;
    const files = [...fileList].slice(0, Math.max(0, room));
    if (fileList.length > files.length) setError(t("You can add up to {n} photos.", { n: MAX_PHOTOS }));
    for (const file of files) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setUploads((u) => [...u, { id, name: file.name, status: "uploading" }]);
      try {
        const url = await uploadPartPhoto(file);
        setForm((prev) => ({ ...prev, photos: [...prev.photos, { url }].slice(0, MAX_PHOTOS) }));
        setUploads((u) => u.filter((x) => x.id !== id));
      } catch (err) {
        setUploads((u) => u.map((x) => (x.id === id ? { ...x, status: "error", error: err.message } : x)));
      }
    }
  }

  function makeMain(index) {
    setForm((prev) => {
      const photos = [...prev.photos];
      const [p] = photos.splice(index, 1);
      return { ...prev, photos: [p, ...photos] };
    });
  }

  function removePhoto(index) {
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
  }

  // ---------- fitment ----------
  function addFitment() {
    setForm((prev) => ({ ...prev, fitment: [...prev.fitment, { make: "", model: "", year_start: "", year_end: "" }] }));
  }
  function setFitment(i, key, value) {
    setForm((prev) => ({
      ...prev,
      fitment: prev.fitment.map((row, idx) => (idx === i ? { ...row, [key]: value, ...(key === "make" ? { model: "" } : {}) } : row)),
    }));
    if (key === "make") loadModels(value);
  }
  function removeFitment(i) {
    setForm((prev) => ({ ...prev, fitment: prev.fitment.filter((_, idx) => idx !== i) }));
  }

  // ---------- navigation ----------
  const currentYear = new Date().getFullYear() + 1;
  function validate(s) {
    if (s === 0) {
      if (form.title.trim().length < 4) return t("Give the part a clear title (at least 4 characters).");
      if (!form.category_id) return t("Choose a category.");
    }
    if (s === 1 && uploads.some((u) => u.status === "uploading")) return t("Wait for the photos to finish uploading.");
    if (s === 2) {
      const price = parseMoneyInput(form.price);
      // parseMoneyInput returns NaN for text that isn't an amount.
      if (!Number.isFinite(price) || price <= 0) return t("Enter the price in dirhams, e.g. 350 or 349,90.");
      if (form.compare_price) {
        const cp = parseMoneyInput(form.compare_price);
        if (!Number.isFinite(cp) || cp <= price) return t("The price before discount must be higher than the price.");
      }
      if (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 0) return t("Quantity must be 0 or more.");
    }
    if (s === 3) {
      for (const row of form.fitment) {
        if (!row.make && !row.model && !row.year_start && !row.year_end) continue;
        if (!row.make || !row.model) return t("Each vehicle needs a make and a model, or remove the row.");
        const ys = Number(row.year_start);
        const ye = row.year_end ? Number(row.year_end) : ys;
        if (!ys || ys < 1950 || ys > currentYear) return t("Year must be between 1950 and {maxYear}", { maxYear: currentYear });
        if (ye < ys || ye > currentYear) return t("The end year must be the same as or after the start year.");
      }
    }
    return "";
  }

  function go(next) {
    if (next > step) {
      for (let s = step; s < next; s++) {
        const msg = validate(s);
        if (msg) {
          setStep(s);
          setError(msg);
          return;
        }
      }
    }
    setError("");
    setStep(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- publish ----------
  async function publish() {
    for (let s = 0; s < 4; s++) {
      const msg = validate(s);
      if (msg) {
        setStep(s);
        setError(msg);
        return;
      }
    }
    setPublishing(true);
    setError("");
    const warnings = [];
    try {
      const base = slugify(form.title) || "part";
      const payload = {
        title: form.title.trim(),
        slug: `${base}-${Math.random().toString(36).slice(2, 7)}`,
        category_id: Number(form.category_id),
        brand_id: form.brand_id ? Number(form.brand_id) : null,
        condition: form.condition,
        part_origin: form.part_origin,
        sku: form.sku.trim() || null,
        price: parseMoneyInput(form.price),
        compare_price: form.compare_price ? parseMoneyInput(form.compare_price) : null,
        quantity: Number(form.quantity),
        description: form.description.trim() || null,
        image_url: form.photos[0]?.url || null,
      };
      const res = await api.post("/api/v1/marketplace/me/parts", payload);
      const part = res?.data;
      const partId = part?.id;
      if (!partId) throw new Error(t("Failed to create part"));

      for (let i = 1; i < form.photos.length; i++) {
        try {
          await api.post(`/api/v1/marketplace/parts/${partId}/images`, { url: form.photos[i].url, sort_order: i + 1, is_featured: false });
        } catch {
          warnings.push(t("A photo could not be attached. Add it again from the edit page."));
        }
      }
      for (const row of form.fitment) {
        if (!row.make || !row.model) continue;
        try {
          await api.post(`/api/v1/marketplace/me/parts/${partId}/compatibility`, {
            make: row.make,
            model: row.model,
            year_start: Number(row.year_start),
            year_end: row.year_end ? Number(row.year_end) : Number(row.year_start),
          });
        } catch (err) {
          warnings.push(`${row.make} ${row.model}: ${err.message}`);
        }
      }
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
      setDone({ id: partId, title: payload.title, status: part.status, warnings: [...new Set(warnings)] });
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setError(err?.message || t("Failed to create part"));
    } finally {
      setPublishing(false);
    }
  }

  function startOver() {
    setForm(EMPTY);
    setStep(0);
    setDone(null);
    setError("");
  }

  // ---------- render ----------
  if (done) {
    return (
      <section ref={topRef} className="mx-auto max-w-2xl rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Icon name="in-stock" className="h-8 w-8" /></span>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">{t("Part saved")}</h1>
        <p className="mt-1 text-gray-700">{done.title}</p>
        <p className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
          {done.status === "active"
            ? t("It is live in the catalog.")
            : t("PartHub reviews new listings before they go live. You'll see the status in your inventory.")}
        </p>
        {done.warnings.length ? (
          <ul className="mt-3 space-y-1 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {done.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={startOver} className="h-12 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700">
            {t("+ Add another part")}
          </button>
          <Link to={`/parts/${done.id}/edit`} className="inline-flex h-12 items-center rounded-2xl border border-gray-200 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            {t("Edit this part")}
          </Link>
          <Link to="/parts" className="inline-flex h-12 items-center rounded-2xl border border-gray-200 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            {t("Back to inventory")}
          </Link>
        </div>
      </section>
    );
  }

  const priceCents = parseMoneyInput(form.price);
  const hasDraft = form.title || form.photos.length || form.price;

  return (
    <section ref={topRef} className="mx-auto max-w-3xl space-y-5 pb-28">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("Add a part")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("Five short steps. Your progress is saved on this device.")}</p>
        </div>
        {hasDraft ? (
          <button type="button" onClick={startOver} className="text-sm font-semibold text-gray-500 underline underline-offset-2 hover:text-gray-800">
            {t("Start over")}
          </button>
        ) : null}
      </div>

      {/* Progress */}
      <ol className="grid grid-cols-5 gap-1.5" aria-label={t("Steps")}>
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => go(i)}
              aria-current={i === step ? "step" : undefined}
              className="w-full text-start"
            >
              <span className={["block h-1.5 rounded-full", i <= step ? "bg-blue-600" : "bg-gray-200"].join(" ")} />
              <span className={["mt-1.5 hidden text-xs font-semibold sm:block", i === step ? "text-blue-700" : "text-gray-500"].join(" ")}>
                {i + 1}. {t(label)}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="text-sm font-semibold text-blue-700 sm:hidden">
        {t("Step {n} of {total}", { n: step + 1, total: STEPS.length })} · {t(STEPS[step])}
      </p>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        {step === 0 ? (
          <div className="space-y-5">
            <Field label={t("What are you selling?")} htmlFor="w-title" hint={t("Part name, then brand and vehicle, e.g. “Front brake pads Bosch – Clio 4”.")}>
              <input id="w-title" value={form.title} onChange={(e) => set("title")(e.target.value)} className={inputCls} placeholder={t("e.g. Alternator Valeo 90A Clio IV 1.5 dCi")} />
            </Field>

            <Field label={t("Category")} htmlFor="w-cat">
              <select id="w-cat" value={form.category_id} onChange={(e) => set("category_id")(e.target.value)} className={inputCls}>
                <option value="">{t("Select category")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t(c.name)}
                  </option>
                ))}
              </select>
              {suggestedCategory && String(suggestedCategory.id) !== String(form.category_id) ? (
                <button
                  type="button"
                  onClick={() => set("category_id")(String(suggestedCategory.id))}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                >
                  <Icon name="suggestion" className="h-3.5 w-3.5" /> {t("Suggested: {name}", { name: t(suggestedCategory.name) })}
                </button>
              ) : null}
            </Field>

            <Field label={t("Brand (optional)")} htmlFor="w-brand">
              <select id="w-brand" value={form.brand_id} onChange={(e) => set("brand_id")(e.target.value)} className={inputCls}>
                <option value="">{t("No brand / not sure")}</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {suggestedBrand && String(suggestedBrand.id) !== String(form.brand_id) ? (
                <button
                  type="button"
                  onClick={() => set("brand_id")(String(suggestedBrand.id))}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                >
                  <Icon name="suggestion" className="h-3.5 w-3.5" /> {t("Suggested: {name}", { name: suggestedBrand.name })}
                </button>
              ) : null}
            </Field>

            <Field label={t("Condition")}>
              <Segmented
                label={t("Condition")}
                value={form.condition}
                onChange={set("condition")}
                options={[["used", t("Used")], ["new", t("New")], ["refurbished", t("Refurbished")]]}
              />
            </Field>

            <Field label={t("Origin")} hint={t("OEM = made by the car maker. Aftermarket = compatible part from another brand.")}>
              <Segmented
                label={t("Origin")}
                value={form.part_origin}
                onChange={set("part_origin")}
                options={[["oem", t("OEM")], ["aftermarket", t("Aftermarket")], ["used", t("Used Part")]]}
              />
            </Field>

            <Field label={t("OEM / part number (optional)")} htmlFor="w-sku" hint={t("Buyers often search by this number.")}>
              <input id="w-sku" dir="ltr" value={form.sku} onChange={(e) => set("sku")(e.target.value)} className={inputCls} placeholder="231004779R" />
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t("Photos")}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {t("Up to {n} photos. The first one is the main photo. Listings with real photos get far more clicks.", { n: MAX_PHOTOS })}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {form.photos.map((photo, i) => (
                <figure key={photo.url} className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                  <img src={mediaUrl(photo.url)} alt="" className="aspect-square w-full object-cover" />
                  {i === 0 ? (
                    <span className="absolute start-1.5 top-1.5 rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{t("Main")}</span>
                  ) : null}
                  <div className="flex border-t border-gray-200 bg-white text-xs font-semibold">
                    {i > 0 ? (
                      <button type="button" onClick={() => makeMain(i)} className="flex-1 py-2 text-blue-700 hover:bg-blue-50">
                        {t("Make main")}
                      </button>
                    ) : null}
                    <button type="button" onClick={() => removePhoto(i)} className="flex-1 py-2 text-red-700 hover:bg-red-50" aria-label={t("Remove photo")}>
                      {t("Remove")}
                    </button>
                  </div>
                </figure>
              ))}
              {uploads.map((u) => (
                <div key={u.id} className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-2 text-center text-xs">
                  {u.status === "uploading" ? (
                    <span className="text-gray-500">{t("Uploading…")}</span>
                  ) : (
                    <>
                      <span className="font-semibold text-red-700">{t("Upload failed")}</span>
                      <span className="mt-1 line-clamp-3 text-red-700">{u.error}</span>
                      <button type="button" onClick={() => setUploads((x) => x.filter((y) => y.id !== u.id))} className="mt-1 underline">
                        {t("Close")}
                      </button>
                    </>
                  )}
                </div>
              ))}
              {form.photos.length + uploads.filter((u) => u.status === "uploading").length < MAX_PHOTOS ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  <Icon name="add-photo" className="h-7 w-7" />
                  {t("Add photos")}
                </button>
              ) : null}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                addPhotos(e.target.files || []);
                e.target.value = "";
              }}
            />
            {!form.photos.length ? (
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {t("Tip: a photo of the real part (and its label or reference) builds trust. You can also add photos later.")}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Price (MAD)")} htmlFor="w-price" hint={Number.isFinite(priceCents) && priceCents > 0 ? formatMoney(priceCents) : t("e.g. 350 or 349,90")}>
                <input id="w-price" inputMode="decimal" dir="ltr" value={form.price} onChange={(e) => set("price")(e.target.value)} className={inputCls} placeholder="350" />
              </Field>
              <Field label={t("Price before discount (optional)")} htmlFor="w-cprice" hint={t("Shown crossed out next to the price.")}>
                <input id="w-cprice" inputMode="decimal" dir="ltr" value={form.compare_price} onChange={(e) => set("compare_price")(e.target.value)} className={inputCls} placeholder="420" />
              </Field>
            </div>

            <Field label={t("Quantity in stock")}>
              <div className="inline-flex h-12 items-center rounded-2xl border border-gray-200 bg-white">
                <button type="button" onClick={() => set("quantity")(Math.max(0, Number(form.quantity) - 1))} className="h-full w-12 text-xl text-gray-700" aria-label={t("Decrease quantity")}>
                  −
                </button>
                <input
                  inputMode="numeric"
                  value={form.quantity}
                  onChange={(e) => set("quantity")(e.target.value.replace(/\D/g, "") === "" ? "" : Number(e.target.value.replace(/\D/g, "")))}
                  className="h-full w-16 border-x border-gray-200 text-center text-sm font-semibold outline-none"
                  aria-label={t("Quantity in stock")}
                />
                <button type="button" onClick={() => set("quantity")(Number(form.quantity || 0) + 1)} className="h-full w-12 text-xl text-gray-700" aria-label={t("Increase quantity")}>
                  +
                </button>
              </div>
            </Field>

            <Field label={t("Description (optional)")} htmlFor="w-desc" hint={t("Mileage, tested or not, what's included, delivery options…")}>
              <textarea id="w-desc" rows={4} value={form.description} onChange={(e) => set("description")(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500" />
            </Field>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t("Fits which vehicles?")}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {t("Optional, but buyers who search by their car see compatible parts first, and you get matched with their part requests.")}
              </p>
            </div>
            {form.fitment.map((row, i) => (
              <div key={i} className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:grid-cols-[1fr_1fr_90px_90px_auto] sm:items-end">
                <Field label={t("Make")}>
                  <select value={row.make} onChange={(e) => setFitment(i, "make", e.target.value)} className={inputCls}>
                    <option value="">{t("Select make")}</option>
                    {makes.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("Model")}>
                  <select value={row.model} onChange={(e) => setFitment(i, "model", e.target.value)} disabled={!row.make} className={inputCls}>
                    <option value="">{row.make ? t("Select model") : t("Choose make first")}</option>
                    {modelsFor(row.make).map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("From")}>
                  <input inputMode="numeric" dir="ltr" value={row.year_start} onChange={(e) => setFitment(i, "year_start", e.target.value.replace(/\D/g, "").slice(0, 4))} className={inputCls} placeholder="2013" />
                </Field>
                <Field label={t("To")}>
                  <input inputMode="numeric" dir="ltr" value={row.year_end} onChange={(e) => setFitment(i, "year_end", e.target.value.replace(/\D/g, "").slice(0, 4))} className={inputCls} placeholder="2019" />
                </Field>
                <button type="button" onClick={() => removeFitment(i)} className="h-12 rounded-2xl px-3 text-sm font-semibold text-red-700 hover:bg-red-50">
                  {t("Remove")}
                </button>
              </div>
            ))}
            <button type="button" onClick={addFitment} className="h-12 rounded-2xl border-2 border-dashed border-blue-300 px-5 text-sm font-semibold text-blue-700 hover:bg-blue-50">
              {t("+ Add a vehicle")}
            </button>
            <p className="text-xs text-gray-500">{t("You can add more details (engine, trim) later from the edit page.")}</p>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">{t("Check and publish")}</h2>
            <div className="flex gap-4">
              <div className="h-24 w-24 flex-none overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                {form.photos[0] ? <img src={mediaUrl(form.photos[0].url)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-gray-400"><Icon name="part" className="h-9 w-9" /></div>}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{form.title}</p>
                <p className="mt-1 text-sm text-gray-500">{categoryName(form.category_id)}</p>
                <p className="mt-1 font-mono text-lg font-bold text-gray-900">{Number.isFinite(priceCents) && priceCents > 0 ? formatMoney(priceCents) : "—"}</p>
              </div>
            </div>
            <dl className="divide-y divide-gray-100 rounded-2xl border border-gray-200 text-sm">
              {[
                [t("Condition"), t(form.condition === "new" ? "New" : form.condition === "refurbished" ? "Refurbished" : "Used"), 0],
                [t("Origin"), t(form.part_origin === "oem" ? "OEM" : form.part_origin === "used" ? "Used Part" : "Aftermarket"), 0],
                [t("Photos"), String(form.photos.length), 1],
                [t("Quantity in stock"), String(form.quantity), 2],
                [t("Vehicles"), form.fitment.filter((r) => r.make && r.model).map((r) => `${r.make} ${r.model} ${r.year_start}${r.year_end && r.year_end !== r.year_start ? `–${r.year_end}` : ""}`).join(", ") || t("None"), 3],
              ].map(([k, v, s]) => (
                <div key={k} className="flex items-center justify-between gap-3 px-4 py-3">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="flex min-w-0 items-center gap-3 text-end font-semibold text-gray-900">
                    <span className="truncate">{v}</span>
                    <button type="button" onClick={() => go(s)} className="flex-none text-xs font-semibold text-blue-700 underline">
                      {t("Edit")}
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-gray-500">{t("New listings are reviewed by PartHub before they go live.")}</p>
          </div>
        ) : null}
      </div>

      {/* Sticky actions (thumb reach on phones) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}>
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          {step > 0 ? (
            <button type="button" onClick={() => go(step - 1)} className="h-12 rounded-2xl border border-gray-200 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              {t("Back")}
            </button>
          ) : (
            <button type="button" onClick={() => navigate("/parts")} className="h-12 rounded-2xl border border-gray-200 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              {t("Cancel")}
            </button>
          )}
          {step === 3 && !form.fitment.length ? (
            <button type="button" onClick={() => go(4)} className="h-12 flex-1 rounded-2xl border border-gray-200 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              {t("Skip for now")}
            </button>
          ) : null}
          {step < 4 ? (
            <button type="button" onClick={() => go(step + 1)} className="h-12 flex-1 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700">
              {t("Next")}
            </button>
          ) : (
            <button type="button" onClick={publish} disabled={publishing} className="h-12 flex-1 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              {publishing ? t("Saving…") : t("Publish part")}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

