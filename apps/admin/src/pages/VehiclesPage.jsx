import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

export default function VehiclesPage() {
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [years, setYears] = useState([]);

  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");

  const [loadingMakes, setLoadingMakes] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMakes() {
      try {
        setLoadingMakes(true);
        setError("");
        const res = await api.get("/api/v1/vehicles/makes");
        if (!active) return;
        setMakes(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load vehicle makes");
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
      return;
    }

    let active = true;

    async function loadModels() {
      try {
        setLoadingModels(true);
        setError("");
        const res = await api.get(
          `/api/v1/vehicles/models?make=${encodeURIComponent(selectedMake)}`
        );
        if (!active) return;
        const next = Array.isArray(res?.data) ? res.data : [];
        setModels(next);
        setSelectedModel("");
        setYears([]);
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load vehicle models");
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
      return;
    }

    let active = true;

    async function loadYears() {
      try {
        setLoadingYears(true);
        setError("");
        const res = await api.get(
          `/api/v1/vehicles/years?model=${encodeURIComponent(selectedModel)}`
        );
        if (!active) return;
        setYears(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load vehicle years");
      } finally {
        if (active) setLoadingYears(false);
      }
    }

    loadYears();

    return () => {
      active = false;
    };
  }, [selectedModel]);

  const stats = useMemo(() => {
    return {
      makes: makes.length,
      models: models.length,
      years: years.length,
    };
  }, [makes, models, years]);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-gray-800 bg-gradient-to-br from-gray-900 via-slate-950 to-blue-950 p-6 text-white shadow-xl sm:p-8">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
            Vehicles reference
          </div>
          <h1 className="text-3xl font-bold sm:text-5xl">Vehicle coverage explorer</h1>
          <p className="mt-3 text-sm text-gray-300 sm:text-base">
            Review the current make, model, and year coverage available in the marketplace vehicle dataset.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-900/50 bg-red-950/20 p-6 text-red-300 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Makes loaded</p>
          <p className="mt-2 text-3xl font-bold text-gray-100">{stats.makes}</p>
        </div>
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Models shown</p>
          <p className="mt-2 text-3xl font-bold text-gray-100">{stats.models}</p>
        </div>
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Years shown</p>
          <p className="mt-2 text-3xl font-bold text-gray-100">{stats.years}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-100">Vehicle selector</h2>
          <p className="mt-1 text-sm text-gray-400">
            Inspect available models and years from the current dataset.
          </p>

          <div className="mt-6 grid gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">Make</label>
              <select
                value={selectedMake}
                onChange={(e) => setSelectedMake(e.target.value)}
                disabled={loadingMakes}
                className="h-12 w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 text-sm text-gray-100 outline-none"
              >
                <option value="">{loadingMakes ? "Loading makes..." : "Select make"}</option>
                {makes.map((make) => (
                  <option key={make.id} value={make.slug}>
                    {make.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={!selectedMake || loadingModels}
                className="h-12 w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 text-sm text-gray-100 outline-none"
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
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-100">Coverage details</h2>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-gray-950 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Models</p>
              <div className="mt-3 max-h-80 space-y-2 overflow-auto">
                {models.length === 0 ? (
                  <p className="text-sm text-gray-400">No models loaded.</p>
                ) : (
                  models.map((model) => (
                    <div
                      key={model.id}
                      className="rounded-xl border border-gray-800 px-3 py-2 text-sm text-gray-200"
                    >
                      {model.name}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-gray-950 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Years</p>
              <div className="mt-3 max-h-80 space-y-2 overflow-auto">
                {loadingYears ? (
                  <p className="text-sm text-gray-400">Loading years...</p>
                ) : years.length === 0 ? (
                  <p className="text-sm text-gray-400">No years loaded.</p>
                ) : (
                  years.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-gray-800 px-3 py-2 text-sm text-gray-200"
                    >
                      {item.year}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
