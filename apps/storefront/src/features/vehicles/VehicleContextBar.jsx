import { useSelectedVehicle } from "./SelectedVehicleContext";

export default function VehicleContextBar() {
  const {
    selectedVehicle,
    savedVehicles,
    selectSavedVehicle,
    clearVehicle,
    saveVehicle,
  } = useSelectedVehicle();

  if (!selectedVehicle && (!savedVehicles || savedVehicles.length === 0)) {
    return (
      <div className="rounded-3xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-700 shadow-sm">
        Select and save a vehicle to unlock faster fitment-aware shopping.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Vehicle context
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {selectedVehicle ? selectedVehicle.label : "No active vehicle selected"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedVehicle ? (
            <>
              <button
                type="button"
                onClick={() => saveVehicle(selectedVehicle)}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                Save vehicle
              </button>

              <button
                type="button"
                onClick={clearVehicle}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Clear
              </button>
            </>
          ) : null}

          {savedVehicles?.slice(0, 3).map((vehicle, index) => (
            <button
              key={`${vehicle.label}-${index}`}
              type="button"
              onClick={() => selectSavedVehicle(vehicle)}
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              {vehicle.year} {vehicle.make_name || vehicle.make}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
