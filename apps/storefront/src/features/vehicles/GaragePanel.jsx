import { useSelectedVehicle } from "./SelectedVehicleContext";

export default function GaragePanel() {
  const {
    selectedVehicle,
    savedVehicles,
    saveVehicle,
    removeSavedVehicle,
    selectSavedVehicle,
  } = useSelectedVehicle();

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My garage</h2>
          <p className="mt-1 text-sm text-gray-500">
            Save vehicles for faster fitment search.
          </p>
        </div>

        {selectedVehicle ? (
          <button
            type="button"
            onClick={() => saveVehicle(selectedVehicle)}
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            Save current vehicle
          </button>
        ) : null}
      </div>

      {savedVehicles.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
          No saved vehicles yet.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {savedVehicles.map((vehicle, index) => {
            const isActive = selectedVehicle?.label === vehicle.label;

            return (
              <div
                key={`${vehicle.label}-${index}`}
                className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{vehicle.label}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {isActive ? "Currently selected" : "Saved vehicle"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!isActive ? (
                    <button
                      type="button"
                      onClick={() => selectSavedVehicle(vehicle)}
                      className="inline-flex h-10 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                    >
                      Use vehicle
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => removeSavedVehicle(vehicle)}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
