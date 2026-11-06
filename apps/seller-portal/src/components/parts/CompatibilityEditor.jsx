import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useT } from "../../i18n";
import VehicleFitmentFields, { EMPTY_FITMENT, SuggestCatalogEntry, fitmentLabel, fitmentPayload } from "./VehicleFitmentFields";

// Vehicles this part fits (edit page). Rows are picked from PartHub's
// vehicle catalog: make → model → generation → engine, with the years.
export default function CompatibilityEditor({ partId }) {
  const t = useT();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [vehicle, setVehicle] = useState({ ...EMPTY_FITMENT });
  const [notes, setNotes] = useState("");

  async function loadRows() {
    try {
      const res = await api.get(`/api/v1/marketplace/me/parts/${partId}/compatibility`);
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err?.message || t("Failed to load compatibility"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, [partId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addRow(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!vehicle.make || !vehicle.model) return setError(t("Choose the make and the model."));
    const ys = Number(vehicle.year_start);
    const ye = vehicle.year_end ? Number(vehicle.year_end) : ys;
    const maxYear = new Date().getFullYear() + 1;
    if (!ys || ys < 1950 || ys > maxYear) return setError(t("Year must be between 1950 and {maxYear}", { maxYear }));
    if (ye < ys || ye > maxYear) return setError(t("The end year must be the same as or after the start year."));
    setSaving(true);
    try {
      await api.post(`/api/v1/marketplace/me/parts/${partId}/compatibility`, {
        ...fitmentPayload(vehicle),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      setSuccess(t("Vehicle added: {vehicle}", { vehicle: fitmentLabel(vehicle, t) }));
      // Keep make and model for the next row (often another generation or engine).
      setVehicle({ ...EMPTY_FITMENT, make: vehicle.make, make_slug: vehicle.make_slug, model: vehicle.model, model_slug: vehicle.model_slug });
      setNotes("");
      await loadRows();
    } catch (err) {
      setError(err?.message || t("Could not add this vehicle"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow(id) {
    setError("");
    setSuccess("");
    try {
      await api.delete(`/api/v1/marketplace/me/parts/${partId}/compatibility/${id}`);
      setRows((list) => list.filter((r) => r.id !== id));
    } catch (err) {
      setError(err?.message || t("Could not remove this vehicle"));
    }
  }

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">{t("Fits which vehicles?")}</h2>
      <p className="mt-1 text-sm text-gray-500">
        {t("Buyers who search by their car see compatible parts first. Choose the generation, and the engine when the part depends on it.")}
      </p>

      <div className="mt-5">
        {loading ? (
          <div className="h-12 animate-pulse rounded-2xl bg-gray-100" />
        ) : rows.length ? (
          <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {fitmentLabel(row, t)}
                  </p>
                  {row.notes ? <p className="text-xs text-gray-500">{row.notes}</p> : null}
                  {!row.engine && row.engine_scope !== "all" ? (
                    <p className="text-xs text-amber-700">{t("Buyers will be asked to check the engine. Choose it, or confirm all engines.")}</p>
                  ) : null}
                </div>
                <button type="button" onClick={() => deleteRow(row.id)} className="h-9 flex-none rounded-xl px-3 text-sm font-semibold text-red-700 hover:bg-red-50">
                  {t("Remove")}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
            {t("No vehicle yet. Add the first one below.")}
          </p>
        )}
      </div>

      <form onSubmit={addRow} className="mt-6 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-semibold text-gray-900">{t("Add a vehicle")}</p>
        <VehicleFitmentFields value={vehicle} onChange={(v) => (setVehicle(v), setError(""))} idPrefix="edit-fit" />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={200}
          placeholder={t("Note (optional), e.g. front axle, with air conditioning")}
          aria-label={t("Note (optional)")}
          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
        />
        {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-700" role="status">{success}</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="submit" disabled={saving} className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300">
            {saving ? t("Saving…") : t("+ Add a vehicle")}
          </button>
          <SuggestCatalogEntry kind="vehicle" />
        </div>
      </form>
    </section>
  );
}
