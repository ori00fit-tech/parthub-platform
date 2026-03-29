import { createContext, useContext, useState, useEffect } from "react";
import { VEHICLE_STORAGE_KEY } from "@parthub/shared";

const VehicleContext = createContext(null);

export function VehicleProvider({ children }) {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [savedVehicles, setSavedVehicles] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(VEHICLE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSavedVehicles(parsed.saved ?? []);
        setSelectedVehicle(parsed.selected ?? null);
      }
    } catch {}
  }, []);

  function persist(selected, saved) {
    localStorage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify({ selected, saved }));
  }

  function selectVehicle(vehicle) {
    setSelectedVehicle(vehicle);
    persist(vehicle, savedVehicles);
  }

  function saveVehicle(vehicle) {
    const updated = [...savedVehicles.filter((v) => v.id !== vehicle.id), vehicle];
    setSavedVehicles(updated);
    persist(selectedVehicle, updated);
  }

  function removeVehicle(id) {
    const updated = savedVehicles.filter((v) => v.id !== id);
    setSavedVehicles(updated);
    if (selectedVehicle?.id === id) {
      setSelectedVehicle(null);
      persist(null, updated);
    } else {
      persist(selectedVehicle, updated);
    }
  }

  function clearVehicle() {
    setSelectedVehicle(null);
    persist(null, savedVehicles);
  }

  return (
    <VehicleContext.Provider
      value={{ selectedVehicle, savedVehicles, selectVehicle, saveVehicle, removeVehicle, clearVehicle }}
    >
      {children}
    </VehicleContext.Provider>
  );
}

export const useVehicle = () => useContext(VehicleContext);
