import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../lib/api";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";

export default function VehicleSelectorPage() {
  const { vehicle, setVehicle, clearVehicle } = useSelectedVehicle();

  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [years, setYears] = useState([]);

  const [selectedMake, setSelectedMake] = useState(vehicle?.make || "");
  const [selectedModel, setSelectedModel] = useState(vehicle?.model || "");
  const [selectedYear, setSelectedYear] = useState(vehicle?.year || "");

  const [loadingMakes, setLoadingMakes] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);

  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadMakes() {
      try {
        setError("");
        setLoadingMakes(true);
        const res = await apiGet("/api/v1/vehicles/makes");
        if (!active) return;
        setMakes(res?.data || []);
      } catch (err) {
        if (!active) return;
        setError(err.message || "Failed to load vehicle makes");
      } finally {
        if (active) setLoadingMakes(false);
      }
    }

    loadMakes();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedMake) {
      setModels([]);
      setSelectedModel("");
      setYears([]);
      setSelectedYear("");
      return;
    }

    let active = true;

    async function loadModels() {
      try {
        setError("");
        setLoadingModels(true);
        const res = await apiGet(
          `/api/v1/vehicles/models?make=${encodeURIComponent(selectedMake)}`
        );
        if (!active) return;
        const nextModels = res?.data || [];
        setModels(nextModels);

        if (!nextModels.some((item) => item.slug === selectedModel)) {
          setSelectedModel("");
          setYears([]);
          setSelectedYear("");
        }
      } catch (err) {
        if (!active) return;
        setError(err.message || "Failed to load vehicle models");
      } finally {
        if (active) setLoadingModels(false);
      }
    }

    loadModels();

    return () => {
      active = false;
    };
  }, [selectedMake]);

  useEffect(() => {
    if (!selectedModel) {
      setYears([]);
      setSelectedYear("");
      return;
    }

    let active = true;

    async function loadYears() {
      try {
        setError("");
        setLoadingYears(true);
        const res = await apiGet(
          `/api/v1/vehicles/years?model=${encodeURIComponent(selectedModel)}`
        );
        if (!active) return;
        const nextYears = res?.data || [];
        setYears(nextYears);

        if (!nextYears.some((item) => String(item.year) === String(selectedYear))) {
          setSelectedYear("");
        }
      } catch (err) {
        if (!active) return;
        setError(err.message || "Failed to load vehicle years");
      } finally {
        if (active) setLoadingYears(false);
      }
    }

    loadYears();

    return () => {
      active = false;
    };
  }, [selectedModel]);

  const selectedMakeName = useMemo(() => {
    return makes.find((item) => item.slug === selectedMake)?.name || "";
  }, [makes, selectedMake]);

  const selectedModelName = useMemo(() => {
    return models.find((item) => item.slug === selectedModel)?.name || "";
  }, [models, selectedModel]);

  function handleSave() {
    if (!selectedMake || !selectedModel || !selectedYear) {
      setError("Please choose make, model, and year.");
      return;
    }

    setError("");
    setVehicle({
      make: selectedMake,
      makeName: selectedMakeName,
      model: selectedModel,
      modelName: selectedModelName,
      year: String(selectedYear),
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <section className="space-y-6 pb-10">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
            Vehicle Selector PRO MAX
          </div>

          <h1 className="text-3xl font-bold sm:text-5xl">
            Choose your vehicle first
          </h1>

          <p className="mt-3 text-sm text-blue-100 sm:text-base">
            Select make, model, and year to browse parts faster and improve fitment accuracy.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm">
            ✔ 30 makes
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm">
            ✔ 150 models
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm">
            ✔ 3300 year entries
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      {saved ? (
        <div className="rounded-3xl border border-green-200 bg-green-50 p-5 text-green-700 shadow-sm">
          Vehicle saved successfully.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Select your vehicle</h2>
              <p className="text-sm text-gray-500">
                Start with the make, then model, then year.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Make</span>
                <select
                  value={selectedMake}
                  onChange={(e) => setSelectedMake(e.target.value)}
                  disabled={loadingMakes}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
                >
                  <option value="">
                    {loadingMakes ? "Loading makes..." : "Select make"}
                  </option>
                  {makes.map((make) => (
                    <option key={make.id} value={make.slug}>
                      {make.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Model</span>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={!selectedMake || loadingModels}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
                >
                  <option value="">
                    {!selectedMake
                      ? "Choose make first"
                      : loadingModels
                      ? "Loading models..."
                      : "Select model"}
                  </option>
                  {models.map((model) => (
                    <option key={model.id} value={model.slug}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Year</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  disabled={!selectedModel || loadingYears}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
                >
                  <option value="">
                    {!selectedModel
                      ? "Choose model first"
                      : loadingYears
                      ? "Loading years..."
                      : "Select year"}
                  </option>
                  {years.map((item) => (
                    <option key={item.id} value={item.year}>
                      {item.year}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Save vehicle
              </button>

              <Link
                to="/parts"
                className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Browse parts
              </Link>

              <button
                type="button"
                onClick={clearVehicle}
                className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
              >
                Clear vehicle
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Current selection</h2>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Make</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {selectedMakeName || vehicle?.makeName || "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Model</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {selectedModelName || vehicle?.modelName || "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Year</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {selectedYear || vehicle?.year || "-"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Why this matters</h2>
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              <p>✔ Faster catalog browsing</p>
              <p>✔ Better fitment workflows</p>
              <p>✔ Stronger vehicle-specific search foundation</p>
              <p>✔ Ready for VIN / plate lookup later</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
