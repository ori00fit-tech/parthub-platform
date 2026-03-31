import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";

export default function VehicleSelectorPage() {
  const { vehicle, setVehicle, clearVehicle } = useSelectedVehicle();

  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [years, setYears] = useState([]);

  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const [loadingMakes, setLoadingMakes] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);

  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // LOAD MAKES
  useEffect(() => {
    let active = true;

    apiGet("/api/v1/vehicles/makes")
      .then((res) => {
        if (!active) return;
        setMakes(res?.data || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Failed to load vehicle makes");
      })
      .finally(() => {
        if (active) setLoadingMakes(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // LOAD MODELS
  useEffect(() => {
    if (!selectedMake) {
      setModels([]);
      setSelectedModel("");
      setYears([]);
      setSelectedYear("");
      return;
    }

    let active = true;
    setLoadingModels(true);

    apiGet(`/api/v1/vehicles/models?make=${encodeURIComponent(selectedMake)}`)
      .then((res) => {
        if (!active) return;
        setModels(res?.data || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Failed to load models");
      })
      .finally(() => {
        if (active) setLoadingModels(false);
      });

    return () => {
      active = false;
    };
  }, [selectedMake]);

  // LOAD YEARS
  useEffect(() => {
    if (!selectedModel) {
      setYears([]);
      setSelectedYear("");
      return;
    }

    let active = true;
    setLoadingYears(true);

    apiGet(`/api/v1/vehicles/years?model=${encodeURIComponent(selectedModel)}`)
      .then((res) => {
        if (!active) return;
        setYears(res?.data || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Failed to load years");
      })
      .finally(() => {
        if (active) setLoadingYears(false);
      });

    return () => {
      active = false;
    };
  }, [selectedModel]);

  const selectedMakeName = useMemo(
    () => makes.find((m) => m.slug === selectedMake)?.name || "",
    [makes, selectedMake]
  );

  const selectedModelName = useMemo(
    () => models.find((m) => m.slug === selectedModel)?.name || "",
    [models, selectedModel]
  );

  function handleSave() {
    if (!selectedMake || !selectedModel || !selectedYear) {
      setError("Please choose make, model, and year.");
      return;
    }

    setVehicle({
      make: selectedMake,
      makeName: selectedMakeName,
      model: selectedModel,
      modelName: selectedModelName,
      year: selectedYear,
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section className="space-y-6 pb-10">

      {/* HERO */}
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold sm:text-5xl">
          Vehicle Selector PRO MAX
        </h1>
        <p className="mt-3 text-sm text-blue-100">
          Choose your vehicle to unlock accurate parts matching.
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* SELECTOR */}
      <div className="rounded-3xl border bg-white p-6 shadow-sm space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">

          <select
            value={selectedMake}
            onChange={(e) => setSelectedMake(e.target.value)}
            className="h-12 rounded-xl border px-3"
          >
            <option value="">
              {loadingMakes ? "Loading..." : "Select make"}
            </option>
            {makes.map((m) => (
              <option key={m.id} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>

          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={!selectedMake || loadingModels}
            className="h-12 rounded-xl border px-3"
          >
            <option value="">
              {!selectedMake
                ? "Choose make first"
                : loadingModels
                ? "Loading..."
                : "Select model"}
            </option>
            {models.map((m) => (
              <option key={m.id} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            disabled={!selectedModel || loadingYears}
            className="h-12 rounded-xl border px-3"
          >
            <option value="">
              {!selectedModel
                ? "Choose model first"
                : loadingYears
                ? "Loading..."
                : "Select year"}
            </option>
            {years.map((y) => (
              <option key={y.id} value={y.year}>
                {y.year}
              </option>
            ))}
          </select>

        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="rounded-xl bg-blue-600 px-5 py-2 text-white"
          >
            Save vehicle
          </button>

          <button
            onClick={clearVehicle}
            className="rounded-xl border px-5 py-2"
          >
            Clear
          </button>
        </div>

        {saved && (
          <p className="text-green-600 text-sm">
            Vehicle saved successfully ✅
          </p>
        )}
      </div>

      {/* CURRENT */}
      {vehicle && (
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="font-bold text-lg mb-2">Current vehicle</h2>
          <p>{vehicle.makeName} {vehicle.modelName} {vehicle.year}</p>
        </div>
      )}

    </section>
  );
}
