import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "parthub_selected_vehicle";

const SelectedVehicleContext = createContext(null);

function safeRead() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeVehicle(vehicle) {
  if (!vehicle) return null;

  const makeName = vehicle.makeName || vehicle.make_name || vehicle.make || "";
  const modelName = vehicle.modelName || vehicle.model_name || vehicle.model || "";
  const engineName = vehicle.engineName || vehicle.engine_name || vehicle.engine || "";
  const year = vehicle.year || null;

  const label =
    vehicle.label ||
    [year, makeName, modelName, engineName].filter(Boolean).join(" ");

  return {
    ...vehicle,

    // canonical
    year,
    label,

    // snake_case
    make_name: makeName,
    model_name: modelName,
    engine_name: engineName,

    // camelCase
    makeName,
    modelName,
    engineName,

    // short aliases
    make: vehicle.make || makeName,
    model: vehicle.model || modelName,
    engine: vehicle.engine || engineName,
  };
}

export function SelectedVehicleProvider({ children }) {
  const [selectedVehicle, setSelectedVehicleState] = useState(() =>
    normalizeVehicle(safeRead())
  );

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

  const value = useMemo(() => {
    function setSelectedVehicle(vehicle) {
      if (!vehicle) {
        setSelectedVehicleState(null);
        return;
      }

      setSelectedVehicleState(normalizeVehicle(vehicle));
    }

    function clearVehicle() {
      setSelectedVehicleState(null);
    }

    return {
      selectedVehicle,
      vehicle: selectedVehicle,
      setSelectedVehicle,
      clearVehicle,
      hasVehicle: Boolean(selectedVehicle),
    };
  }, [selectedVehicle]);

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
