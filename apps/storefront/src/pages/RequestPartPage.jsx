import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiGet } from "../lib/api";
import { useAuth } from "../features/auth/AuthContext";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";
import { requestsApi } from "../features/requests/api";
import PhotoPicker from "../features/requests/PhotoPicker";

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20";

function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink-2">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

const STEPS = [
  { icon: "📝", title: "Describe the part", text: "Your vehicle and the part you need. It's free." },
  { icon: "📨", title: "Sellers reply", text: "Matching shops and casses send you their best offer." },
  { icon: "✅", title: "Pick the best offer", text: "Compare price, condition and warranty, then contact the seller." },
];

export default function RequestPartPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const { selectedVehicle } = useSelectedVehicle();

  const [form, setForm] = useState(() => ({
    make: selectedVehicle?.make_name || selectedVehicle?.makeName || selectedVehicle?.make || "",
    model: selectedVehicle?.model_name || selectedVehicle?.modelName || selectedVehicle?.model || "",
    year: selectedVehicle?.year ? String(selectedVehicle.year) : "",
    engine: selectedVehicle?.engine_name || selectedVehicle?.engineName || selectedVehicle?.engine || "",
    vin: "",
    part_name: searchParams.get("part") || "",
    oem_number: "",
    category_id: "",
    condition_pref: "any",
    description: "",
    city: "",
    phone: user?.phone || "",
  }));

  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState([]);
  const [photosUploading, setPhotosUploading] = useState(false);

  useEffect(() => {
    apiGet("/api/v1/vehicles/makes")
      .then((res) => setMakes(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setMakes([]));
    apiGet("/api/v1/catalog/categories")
      .then((res) => setCategories(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setCategories([]));
  }, []);

  // The login response has no phone, so fetch it from the profile once.
  useEffect(() => {
    if (!isAuthenticated || user?.phone) return;
    let active = true;
    apiGet("/api/v1/auth/me", undefined, { auth: true })
      .then((res) => {
        const phone = res?.data?.phone;
        if (active && phone) setForm((prev) => (prev.phone ? prev : { ...prev, phone }));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.phone]);

  // Suggest models once the typed make matches a known make.
  const matchedMake = useMemo(
    () => makes.find((m) => m.name?.toLowerCase() === form.make.trim().toLowerCase()) || null,
    [makes, form.make]
  );

  useEffect(() => {
    if (!matchedMake) {
      setModels([]);
      return;
    }
    apiGet("/api/v1/vehicles/models", { make: matchedMake.slug })
      .then((res) => setModels(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setModels([]));
  }, [matchedMake]);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const payload = {
        ...form,
        images,
        year: form.year ? Number(form.year) : null,
        category_id: form.category_id ? Number(form.category_id) : null,
      };
      const res = await requestsApi.create(payload);
      navigate(`/requests/${res.data.id}`, { state: { justCreated: true } });
    } catch (err) {
      setError(err.message || "Could not send your request");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-slate-950 px-6 py-8 text-white sm:px-10 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">Request a part</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          Can't find your part? Let the sellers come to you.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
          Send one request and every matching shop and dismantler on PartHub can reply with an offer.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="text-xl">{step.icon}</div>
              <p className="mt-2 text-sm font-bold">
                {i + 1}. {step.title}
              </p>
              <p className="mt-1 text-xs text-faint">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {!isAuthenticated ? (
        <section className="rounded-3xl border border-line bg-surface p-8 text-center shadow-sm">
          <h2 className="text-xl font-bold text-ink">Sign in to send a request</h2>
          <p className="mt-2 text-sm text-muted">
            We need an account so sellers' offers reach you and only you can accept them.
          </p>
          <Link
            to="/auth"
            className="mt-5 inline-flex h-11 items-center rounded-xl bg-navy px-6 text-sm font-bold text-white transition hover:bg-navy-deep"
          >
            Sign in or create an account
          </Link>
        </section>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
              <h2 className="text-lg font-bold text-ink">🚗 Your vehicle</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Make" required>
                  <input
                    className={inputClass}
                    value={form.make}
                    onChange={update("make")}
                    list="request-makes"
                    placeholder="e.g. Renault"
                    required
                  />
                  <datalist id="request-makes">
                    {makes.map((m) => (
                      <option key={m.id} value={m.name} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Model" required>
                  <input
                    className={inputClass}
                    value={form.model}
                    onChange={update("model")}
                    list="request-models"
                    placeholder="e.g. Clio"
                    required
                  />
                  <datalist id="request-models">
                    {models.map((m) => (
                      <option key={m.id} value={m.name} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Year">
                  <input
                    className={inputClass}
                    value={form.year}
                    onChange={update("year")}
                    inputMode="numeric"
                    placeholder="e.g. 2015"
                  />
                </Field>
                <Field label="Engine">
                  <input
                    className={inputClass}
                    value={form.engine}
                    onChange={update("engine")}
                    placeholder="e.g. 1.5 dCi"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="VIN (chassis number)" hint="Optional, but helps sellers find the exact part. 17 characters.">
                    <input
                      className={`${inputClass} uppercase`}
                      value={form.vin}
                      onChange={update("vin")}
                      maxLength={17}
                      placeholder="VF1..."
                    />
                  </Field>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
              <h2 className="text-lg font-bold text-ink">⚙️ The part you need</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Part" required>
                    <input
                      className={inputClass}
                      value={form.part_name}
                      onChange={update("part_name")}
                      placeholder="e.g. Alternator, front left headlight…"
                      required
                    />
                  </Field>
                </div>
                <Field label="Category">
                  <select className={inputClass} value={form.category_id} onChange={update("category_id")}>
                    <option value="">Not sure</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="OEM / part number">
                  <input
                    className={inputClass}
                    value={form.oem_number}
                    onChange={update("oem_number")}
                    placeholder="If you know it"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-semibold text-ink-2">Condition</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ["any", "New or used"],
                      ["used", "Used"],
                      ["new", "New"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, condition_pref: value }))}
                        className={[
                          "h-11 rounded-xl border text-sm font-semibold transition",
                          form.condition_pref === value
                            ? "border-sky-400 bg-navy/20 text-link"
                            : "border-line text-muted hover:bg-surface-3",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Details">
                    <textarea
                      className={`${inputClass} h-28 py-2`}
                      value={form.description}
                      onChange={update("description")}
                      maxLength={1000}
                      placeholder="Side, colour, what's wrong, anything that helps…"
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <PhotoPicker onChange={setImages} onUploadingChange={setPhotosUploading} />
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-40 lg:self-start">
            <section className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
              <h2 className="text-lg font-bold text-ink">📍 Contact</h2>
              <div className="mt-4 space-y-4">
                <Field label="City" required>
                  <input
                    className={inputClass}
                    value={form.city}
                    onChange={update("city")}
                    placeholder="e.g. Casablanca"
                    required
                  />
                </Field>
                <Field label="Phone / WhatsApp" required hint="We'll message you on WhatsApp when offers arrive. Only shared with the seller whose offer you accept.">
                  <input
                    className={inputClass}
                    value={form.phone}
                    onChange={update("phone")}
                    inputMode="tel"
                    placeholder="06 00 00 00 00"
                    required
                  />
                </Field>
              </div>

              {error ? (
                <p className="mt-4 rounded-xl bg-red-400/10 px-3 py-2 text-sm text-red-700">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={saving || photosUploading}
                className="btn-cta mt-5 h-12 w-full rounded-xl text-sm"
              >
                {saving ? "Sending…" : photosUploading ? "Uploading photos…" : "Send request to sellers"}
              </button>
              <p className="mt-3 text-center text-xs text-muted">
                Free · Open for 14 days · No obligation to buy
              </p>
            </section>

            <Link
              to="/requests"
              className="block rounded-2xl border border-line bg-surface px-4 py-3 text-center text-sm font-semibold text-ink-2 shadow-sm transition hover:bg-surface-3"
            >
              View my requests →
            </Link>
          </aside>
        </form>
      )}
    </div>
  );
}
