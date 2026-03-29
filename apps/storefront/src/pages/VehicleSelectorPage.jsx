import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { vehiclesApi } from "../features/vehicles/api";
import { useVehicle } from "../features/vehicles/VehicleContext";

export default function VehicleSelectorPage() {
  const navigate = useNavigate();
  const { selectVehicle, selectedVehicle, clearVehicle } = useVehicle();

  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [years, setYears] = useState([]);
  const [sel, setSel] = useState({ make_id: "", make: "", model_id: "", model: "", year: "" });

  useEffect(() => {
    vehiclesApi.getMakes().then((r) => setMakes(r.data)).catch(() => {});
  }, []);

  async function onMakeChange(e) {
    const opt = makes.find((m) => m.id === Number(e.target.value));
    setSel({ make_id: e.target.value, make: opt?.name ?? "", model_id: "", model: "", year: "" });
    setModels([]); setYears([]);
    if (e.target.value) {
      const r = await vehiclesApi.getModels(e.target.value);
      setModels(r.data);
    }
  }

  async function onModelChange(e) {
    const opt = models.find((m) => m.id === Number(e.target.value));
    setSel((p) => ({ ...p, model_id: e.target.value, model: opt?.name ?? "", year: "" }));
    setYears([]);
    if (e.target.value) {
      const r = await vehiclesApi.getYears(e.target.value);
      setYears(r.data);
    }
  }

  function onApply() {
    if (!sel.make || !sel.model || !sel.year) return;
    selectVehicle({
      make_id: Number(sel.make_id),
      make: sel.make,
      model_id: Number(sel.model_id),
      model: sel.model,
      year: Number(sel.year),
      display_label: `${sel.year} ${sel.make} ${sel.model}`,
      id: `${sel.make_id}-${sel.model_id}-${sel.year}`,
      is_primary: true,
      saved_at: new Date().toISOString(),
    });
    navigate(`/parts?make=${sel.make}&model=${sel.model}&year=${sel.year}`);
  }

  const selectCls = "w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400";

  return (
    <div className="container-app py-12 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Select Your Vehicle</h1>
      <p className="text-gray-500 text-sm mb-8">Find parts that fit your exact vehicle.</p>

      {selectedVehicle && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-500 font-medium mb-0.5">Current vehicle</p>
            <p className="text-blue-800 font-semibold">{selectedVehicle.display_label}</p>
          </div>
          <button onClick={clearVehicle} className="text-xs text-red-500 hover:underline">Clear</button>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
          <select value={sel.make_id} onChange={onMakeChange} className={selectCls}>
            <option value="">Select make…</option>
            {makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <select value={sel.model_id} onChange={onModelChange} disabled={!models.length} className={selectCls}>
            <option value="">Select model…</option>
            {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <select value={sel.year} onChange={(e) => setSel((p) => ({ ...p, year: e.target.value }))} disabled={!years.length} className={selectCls}>
            <option value="">Select year…</option>
            {years.map((y) => <option key={y.year} value={y.year}>{y.year}</option>)}
          </select>
        </div>

        <button
          onClick={onApply}
          disabled={!sel.make || !sel.model || !sel.year}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Find Parts for My Vehicle
        </button>
      </div>
    </div>
  );
}
