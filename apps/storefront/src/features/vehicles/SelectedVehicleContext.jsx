import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "parthub_selected_vehicle";
const GARAGE_KEY = "parthub_saved_vehicles";

const SelectedVehicleContext = createContext(null);

function safeRead(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function buildVehicleLabel(vehicle) {
  if (!vehicle) return "";
  return (
    vehicle.label ||
    [
      vehicle.year,
      vehicle.make_name || vehicle.makeName || vehicle.make,
      vehicle.model_name || vehicle.modelName || vehicle.model,
      vehicle.engine_name || vehicle.engineName || vehicle.engine,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function sameVehicle(a, b) {
  if (!a || !b) return false;

  return (
    String(a.make_name || a.makeName || a.make || "").toLowerCase() ===
      String(b.make_name || b.makeName || b.make || "").toLowerCase() &&
    String(a.model_name || a.modelName || a.model || "").toLowerCase() ===
      String(b.model_name || b.modelName || b.model || "").toLowerCase() &&
    String(a.year || "") === String(b.year || "") &&
    String(a.engine_name || a.engineName || a.engine || "").toLowerCase() ===
      String(b.engine_name || b.engineName || b.engine || "").toLowerCase()
  );
}

export function SelectedVehicleProvider({ children }) {
  const [selectedVehicle, setSelectedVehicleState] = useState(() => safeRead(STORAGE_KEY, null));
  const [savedVehicles, setSavedVehicles] = useState(() => safeRead(GARAGE_KEY, []));

  useEffect(() => {
    try {
      if (selectedVehicle) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedVehicle));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [selectedVehicle]);

  useEffect(() => {
    try {
      localStorage.setItem(GARAGE_KEY, JSON.stringify(savedVehicles));
    } catch {
      // ignore
    }
  }, [savedVehicles]);

  const value = useMemo(() => {
    function normalizeVehicle(vehicle) {
      if (!vehicle) return null;

      return {
        ...vehicle,
        label: buildVehicleLabel(vehicle),
      };
    }

    function setSelectedVehicle(vehicle) {
      const normalized = normalizeVehicle(vehicle);
      setSelectedVehicleState(normalized);
    }

    function clearVehicle() {
      setSelectedVehicleState(null);
    }

    function saveVehicle(vehicle) {
      const normalized = normalizeVehicle(vehicle);
      if (!normalized) return;

      setSavedVehicles((prev) => {
        if (prev.some((item) => sameVehicle(item, normalized))) {
          return prev;
        }

        return [normalized, ...prev].slice(0, 8);
      });
    }

    function removeSavedVehicle(vehicle) {
      setSavedVehicles((prev) => prev.filter((item) => !sameVehicle(item, vehicle)));

      if (sameVehicle(selectedVehicle, vehicle)) {
        setSelectedVehicleState(null);
      }
    }

    function selectSavedVehicle(vehicle) {
      const normalized = normalizeVehicle(vehicle);
      setSelectedVehicleState(normalized);
    }

    return {
      selectedVehicle,
      setSelectedVehicle,
      clearVehicle,
      hasVehicle: Boolean(selectedVehicle),
      savedVehicles,
      saveVehicle,
      removeSavedVehicle,
      selectSavedVehicle,
    };
  }, [selectedVehicle, savedVehicles]);

  return (
    <SelectedVehicleContext.Provider value={value}>
      {children}
    </SelectedVehicleContext.Provider>
  );
}

export function useSelectedVehicle() {
  const ctx = useContext(SelectedVehicleContext);
  if (!ctx) {
    throw new Error("useSelectedVehicle must be used within SelectedVehicleProvider");
  }
  return ctx;
}
