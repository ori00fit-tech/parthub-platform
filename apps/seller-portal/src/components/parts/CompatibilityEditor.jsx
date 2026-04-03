import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

function normalizeList(payload, keyName) {
  const list =
    payload?.data?.[keyName] ||
    payload?.data ||
    payload?.[keyName] ||
    [];

  return Array.isArray(list) ? list : [];
}

export default function CompatibilityEditor({ partId }) {
  const [compatibility, setCompatibility] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [years, setYears] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
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
  });

  useEffect(() => {
    let active = true;

    async function loadAll() {
      try {
        setLoading(true);
        setError("");

        const [compatRes, makesRes] = await Promise.all([
          api.get(`/api/v1/marketplace/me/parts/${partId}/compatibility`),
          api.get("/api/v1/vehicles/makes"),
        ]);

        if (!active) return;

        setCompatibility(normalizeList(compatRes, "compatibility"));
        setMakes(normalizeList(makesRes, "makes"));
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load compatibility data");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAll();

    return () => {
      active = false;
    };
  }, [partId]);

  useEffect(() => {
    if (!form.make) {
      setModels([]);
      setForm((prev) => ({ ...prev, model: "", year_start: "", year_end: "" }));
      setYears([]);
      return;
    }

    let active = true;

    async function loadModels() {
      try {
        const res = await api.get(`/api/v1/vehicles/models?make=${encodeURIComponent(form.make)}`);
        if (!active) return;
        setModels(normalizeList(res, "models"));
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load models");
      }
    }

    loadModels();

    return () => {
      active = false;
    };
  }, [form.make]);

  useEffect(() => {
    if (!form.model) {
      setYears([]);
      setForm((prev) => ({ ...prev, year_start: "", year_end: "" }));
      return;
    }

    let active = true;

    async function loadYears() {
      try {
        const res = await api.get(`/api/v1/vehicles/years?model=${encodeURIComponent(form.model)}`);
        if (!active) return;
        const list = normalizeList(res, "years");
        setYears(list);
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load years");
      }
    }

    loadYears();

    return () => {
      active = false;
    };
  }, [form.model]);

  const sortedCompatibility = useMemo(() => {
    return [...compatibility].sort((a, b) => {
      const makeCompare = String(a.make || "").localeCompare(String(b.make || ""));
      if (makeCompare !== 0) return makeCompare;

      const modelCompare = String(a.model || "").localeCompare(String(b.model || ""));
      if (modelCompare !== 0) return modelCompare;

      return Number(b.year_start || 0) - Number(a.year_start || 0);
    });
  }, [compatibility]);

  function setField(key) {
    return (e) => {
      setError("");
      setSuccess("");
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };
  }

  async function reloadCompatibility() {
    const res = await api.get(`/api/v1/marketplace/me/parts/${partId}/compatibility`);
    setCompatibility(normalizeList(res, "compatibility"));
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.make) {
      setError("Make is required.");
      return;
    }

    if (!form.model) {
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
        make: form.make,
        model: form.model,
        year_start: Number(form.year_start),
        year_end: form.year_end ? Number(form.year_end) : null,
        engine: form.engine.trim() || null,
        trim: form.trim.trim() || null,
        notes: form.notes.trim() || null,
      });

      await reloadCompatibility();

      setForm({
        make: "",
        model: "",
        year_start: "",
        year_end: "",
        engine: "",
        trim: "",
        notes: "",
      });
      setModels([]);
      setYears([]);

      setSuccess("Compatibility added successfully.");
    } catch (err) {
      setError(err?.message || "Failed to add compatibility");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      setDeletingId(id);
      setError("");
      setSuccess("");

      await api.delete(`/api/v1/marketplace/me/parts/${partId}/compatibility/${id}`);
      setCompatibility((prev) => prev.filter((row) => String(row.id) !== String(id)));
      setSuccess("Compatibility removed successfully.");
    } catch (err) {
      setError(err?.message || "Failed to delete compatibility");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
        Loading compatibility editor...
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Compatibility</h2>
        <p className="mt-1 text-sm text-gray-500">
          Link this part to compatible vehicles so search results become much more accurate.
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

      <form onSubmit={handleAdd} className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Make</label>
          <select
            value={form.make}
            onChange={setField("make")}
            className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
          >
            <option value="">Select make</option>
            {makes.map((make) => (
              <option key={make.id} value={make.slug}>
                {make.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Model</label>
          <select
            value={form.model}
            onChange={setField("model")}
            disabled={!form.make}
            className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none disabled:bg-gray-50"
          >
            <option value="">{form.make ? "Select model" : "Choose make first"}</option>
            {models.map((model) => (
              <option key={model.id} value={model.slug}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Year start</label>
          <select
            value={form.year_start}
            onChange={setField("year_start")}
            disabled={!form.model}
            className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none disabled:bg-gray-50"
          >
            <option value="">{form.model ? "Select year start" : "Choose model first"}</option>
            {years.map((row) => (
              <option key={row.id} value={row.year}>
                {row.year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Year end</label>
          <select
            value={form.year_end}
            onChange={setField("year_end")}
            disabled={!form.model}
            className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none disabled:bg-gray-50"
          >
            <option value="">Open ended / same as start</option>
            {years.map((row) => (
              <option key={row.id} value={row.year}>
                {row.year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Engine</label>
          <input
            value={form.engine}
            onChange={setField("engine")}
            placeholder="2.0 TDI"
            className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Trim</label>
          <input
            value={form.trim}
            onChange={setField("trim")}
            placeholder="S Line"
            className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            rows={4}
            value={form.notes}
            onChange={setField("notes")}
            placeholder="Fits only with specific engine code or chassis range..."
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Adding..." : "Add compatibility"}
          </button>
        </div>
      </form>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-gray-900">Current compatibility rows</h3>
          <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {sortedCompatibility.length} rows
          </div>
        </div>

        {sortedCompatibility.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
            No compatibility rows yet. Add at least one vehicle match so search results can find this part.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedCompatibility.map((row) => (
              <div
                key={row.id}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                      <p className="mt-2 text-sm text-gray-500">{row.notes}</p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(row.id)}
                    disabled={deletingId === row.id}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                  >
                    {deletingId === row.id ? "Removing..." : "Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
