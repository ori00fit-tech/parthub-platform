import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "parthub_selected_vehicle";

const SelectedVehicleContext = createContext(null);

export function SelectedVehicleProvider({ children }) {
  const [vehicle, setVehicleState] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setVehicleState(JSON.parse(raw));
      }
    } catch {
      setVehicleState(null);
    }
  }, []);

  function setVehicle(nextVehicle) {
    setVehicleState(nextVehicle);
    try {
      if (nextVehicle) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextVehicle));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }

  function clearVehicle() {
    setVehicle(null);
  }

  const value = useMemo(
    () => ({
      vehicle,
      setVehicle,
      clearVehicle,
      hasVehicle:
        !!vehicle?.make && !!vehicle?.model && !!vehicle?.year,
    }),
    [vehicle]
  );

  return (
    <SelectedVehicleContext.Provider value={value}>
      {children}
    </SelectedVehicleContext.Provider>
  );
}

export function useSelectedVehicle() {
  const ctx = useContext(SelectedVehicleContext);

  if (!ctx) {
    throw new Error("useSelectedVehicle must be used inside SelectedVehicleProvider");
  }

  return ctx;
}
