import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

function parseYearsInput(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item))
    .filter((item) => !Number.isNaN(item))
    .sort((a, b) => a - b);
}

function normalizeRows(payload) {
  const list = payload?.data || payload?.rows || [];
  return Array.isArray(list) ? list : [];
}

const PRESETS = [
  {
    id: "audi-a4-tdi",
    label: "Audi A4 2.0 TDI",
    make: "audi",
    model: "a4",
    year_start: "2014",
    year_end: "2016",
    engine: "2.0 TDI",
    trim: "",
    notes: "Common demand preset",
    bulk_years: "2014,2015,2016",
  },
  {
    id: "vw-golf-tdi",
    label: "VW Golf 2.0 TDI",
    make: "volkswagen",
    model: "golf",
    year_start: "2013",
    year_end: "2020",
    engine: "2.0 TDI",
    trim: "",
    notes: "Common demand preset",
    bulk_years: "2013,2014,2015,2016,2017,2018,2019,2020",
  },
  {
    id: "bmw-320d",
    label: "BMW 320d",
    make: "bmw",
    model: "3 series",
    year_start: "2012",
    year_end: "2018",
    engine: "320d",
    trim: "",
    notes: "Common demand preset",
    bulk_years: "2012,2013,2014,2015,2016,2017,2018",
  },
  {
    id: "mercedes-c220",
    label: "Mercedes C220 CDI",
    make: "mercedes",
    model: "c class",
    year_start: "2014",
    year_end: "2019",
    engine: "C220 CDI",
    trim: "",
    notes: "Common demand preset",
    bulk_years: "2014,2015,2016,2017,2018,2019",
  },
];

export default function CompatibilityEditor({ partId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    make: "",
    model: "",
    year_start: "",
    year_end: "",
    engine: "",
    trim: "",
    notes: "",
    bulk_years: "",
  });

  async function loadRows() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/api/v1/marketplace/me/parts/${partId}/compatibility`);
      setRows(normalizeRows(res));
    } catch (err) {
      setError(err?.message || "Failed to load compatibility");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!partId) return;
    loadRows();
  }, [partId]);

  const parsedBulkYears = useMemo(
    () => parseYearsInput(form.bulk_years),
    [form.bulk_years]
  );

  function setField(key) {
    return (e) => {
      setError("");
      setSuccess("");
      setForm((prev) => ({
        ...prev,
        [key]: e.target.value,
      }));
    };
  }

  function applyPreset(preset) {
    setError("");
    setSuccess("");
    setForm({
      make: preset.make,
      model: preset.model,
      year_start: preset.year_start,
      year_end: preset.year_end,
      engine: preset.engine,
      trim: preset.trim,
      notes: preset.notes,
      bulk_years: preset.bulk_years,
    });
    setSuccess(`Preset loaded: ${preset.label}`);
  }

  async function addSingleRow(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.make.trim()) {
      setError("Make is required.");
      return;
    }

    if (!form.model.trim()) {
      setError("Model is required.");
      return;
    }

    if (!form.year_start) {
      setError("Year start is required.");
      return;
    }

    try {
      setSaving(true);

      await api.post(`/api/v1/marketplace/me/parts/${partId}/compatibility`, {
        make: form.make.trim().toLowerCase(),
        model: form.model.trim().toLowerCase(),
        year_start: Number(form.year_start),
        year_end: form.year_end ? Number(form.year_end) : null,
        engine: form.engine.trim() || null,
        trim: form.trim.trim() || null,
        notes: form.notes.trim() || null,
      });

      setSuccess("Compatibility row added.");
      setForm((prev) => ({
        ...prev,
        year_start: "",
        year_end: "",
        engine: prev.engine,
        trim: prev.trim,
        notes: prev.notes,
      }));
      await loadRows();
    } catch (err) {
      setError(err?.message || "Failed to add compatibility row");
    } finally {
      setSaving(false);
    }
  }

  async function addBulkYears() {
    setError("");
    setSuccess("");

    if (!form.make.trim()) {
      setError("Make is required.");
      return;
    }

    if (!form.model.trim()) {
      setError("Model is required.");
      return;
    }

    if (parsedBulkYears.length === 0) {
      setError("Add comma-separated years first.");
      return;
    }

    try {
      setSaving(true);

      const results = await Promise.allSettled(
        parsedBulkYears.map((year) =>
          api.post(`/api/v1/marketplace/me/parts/${partId}/compatibility`, {
            make: form.make.trim().toLowerCase(),
            model: form.model.trim().toLowerCase(),
            year_start: year,
            year_end: year,
            engine: form.engine.trim() || null,
            trim: form.trim.trim() || null,
            notes: form.notes.trim() || null,
          })
        )
      );

      const successCount = results.filter((item) => item.status === "fulfilled").length;
      const failedCount = results.length - successCount;

      if (successCount > 0 && failedCount === 0) {
        setSuccess(`Added ${successCount} compatibility row${successCount === 1 ? "" : "s"}.`);
      } else if (successCount > 0 && failedCount > 0) {
        setSuccess(`Added ${successCount} row(s). ${failedCount} duplicate or failed row(s) were skipped.`);
      } else {
        setError("No bulk rows were added.");
      }

      await loadRows();
    } catch (err) {
      setError(err?.message || "Bulk add failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow(rowId) {
    try {
      setError("");
      setSuccess("");

      await api.delete(`/api/v1/marketplace/me/parts/${partId}/compatibility/${rowId}`);
      setRows((prev) => prev.filter((row) => row.id !== rowId));
      setSuccess("Compatibility row deleted.");
    } catch (err) {
      setError(err?.message || "Failed to delete row");
    }
  }

  async function duplicateRow(row) {
    try {
      setError("");
      setSuccess("");

      await api.post(`/api/v1/marketplace/me/parts/${partId}/compatibility`, {
        make: row.make,
        model: row.model,
        year_start: row.year_start,
        year_end: row.year_end,
        engine: row.engine || null,
        trim: row.trim || null,
        notes: row.notes || null,
      });

      setSuccess("Compatibility row duplicated.");
      await loadRows();
    } catch (err) {
      setError(err?.message || "Could not duplicate row");
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-950">Quick presets</h2>
        <p className="mt-1 text-sm text-slate-600">
          Load common vehicle fitment presets, then fine-tune before saving rows.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className="rounded-2xl border border-indigo-200 bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50"
            >
              <p className="font-semibold text-gray-900">{preset.label}</p>
              <p className="mt-1 text-xs text-gray-500">
                {preset.year_start} → {preset.year_end} • {preset.engine || "engine not set"}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Compatibility editor</h2>
          <p className="mt-1 text-sm text-gray-500">
            Add exact fitment rows or bulk-add multiple model years for this part.
          </p>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        ) : null}

        <form onSubmit={addSingleRow} className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Make</label>
            <input
              value={form.make}
              onChange={setField("make")}
              placeholder="audi"
              className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Model</label>
            <input
              value={form.model}
              onChange={setField("model")}
              placeholder="a4"
              className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Engine</label>
            <input
              value={form.engine}
              onChange={setField("engine")}
              placeholder="2.0 TDI"
              className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Year start</label>
            <input
              value={form.year_start}
              onChange={setField("year_start")}
              inputMode="numeric"
              placeholder="2014"
              className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Year end</label>
            <input
              value={form.year_end}
              onChange={setField("year_end")}
              inputMode="numeric"
              placeholder="2016"
              className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Trim</label>
            <input
              value={form.trim}
              onChange={setField("trim")}
              placeholder="S Line"
              className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
            />
          </div>

          <div className="sm:col-span-2 xl:col-span-3">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={form.notes}
              onChange={setField("notes")}
              placeholder="Verified seller fitment"
              rows={3}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500"
            />
          </div>

          <div className="sm:col-span-2 xl:col-span-3 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add single row"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900">Bulk add years</h3>
        <p className="mt-1 text-sm text-gray-500">
          Add multiple year-specific compatibility rows at once using comma-separated years.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Years
            </label>
            <input
              value={form.bulk_years}
              onChange={setField("bulk_years")}
              placeholder="2014,2015,2016"
              className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
            />
            <p className="mt-2 text-xs text-gray-500">
              Parsed years: {parsedBulkYears.length ? parsedBulkYears.join(", ") : "none"}
            </p>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={addBulkYears}
              disabled={saving}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:opacity-60"
            >
              {saving ? "Processing..." : "Bulk add years"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Current compatibility rows</h3>
            <p className="mt-1 text-sm text-gray-500">
              Manage the vehicle rows already linked to this part.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-5 text-sm text-gray-500">Loading compatibility rows...</div>
        ) : rows.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
            No compatibility rows linked yet.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">
                    {row.make} • {row.model}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {row.year_start}
                    {row.year_end ? ` → ${row.year_end}` : ""}
                    {row.engine ? ` • ${row.engine}` : ""}
                    {row.trim ? ` • ${row.trim}` : ""}
                  </p>
                  {row.notes ? (
                    <p className="mt-1 text-sm text-gray-500">{row.notes}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => duplicateRow(row)}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                  >
                    Duplicate
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteRow(row.id)}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
