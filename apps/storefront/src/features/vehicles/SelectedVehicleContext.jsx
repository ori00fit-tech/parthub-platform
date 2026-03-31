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

export function SelectedVehicleProvider({ children }) {
  const [selectedVehicle, setSelectedVehicleState] = useState(() => safeRead());

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

      const label =
        vehicle.label ||
        [
          vehicle.year,
          vehicle.make_name || vehicle.make,
          vehicle.model_name || vehicle.model,
          vehicle.engine_name || vehicle.engine,
        ]
          .filter(Boolean)
          .join(" ");

      setSelectedVehicleState({
        ...vehicle,
        label,
      });
    }

    function clearVehicle() {
      setSelectedVehicleState(null);
    }

    return {
      selectedVehicle,
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
