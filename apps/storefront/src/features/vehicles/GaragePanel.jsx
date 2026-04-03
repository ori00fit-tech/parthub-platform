import { useMemo } from "react";
import { useSelectedVehicle } from "./SelectedVehicleContext";

function getVehicleKey(vehicle) {
  return [
    vehicle?.make_name || vehicle?.makeName || vehicle?.make || "",
    vehicle?.model_name || vehicle?.modelName || vehicle?.model || "",
    vehicle?.year || "",
    vehicle?.engine_name || vehicle?.engineName || vehicle?.engine || "",
  ].join("|");
}

export default function GaragePanel() {
  const {
    selectedVehicle,
    savedVehicles,
    saveVehicle,
    removeSavedVehicle,
    selectSavedVehicle,
    clearVehicle,
  } = useSelectedVehicle();

  const activeKey = useMemo(
    () => (selectedVehicle ? getVehicleKey(selectedVehicle) : ""),
    [selectedVehicle]
  );

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My garage</h2>
          <p className="mt-1 text-sm text-gray-500">
            Save vehicles and switch fitment context instantly.
          </p>
        </div>

        {selectedVehicle ? (
          <button
            type="button"
            onClick={() => saveVehicle(selectedVehicle)}
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            Save current
          </button>
        ) : null}
      </div>

      {selectedVehicle ? (
        <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            Active vehicle
          </p>
          <p className="mt-1 text-sm font-semibold text-green-900">
            {selectedVehicle.label}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => saveVehicle(selectedVehicle)}
              className="inline-flex h-9 items-center justify-center rounded-2xl bg-white px-3 text-xs font-semibold text-green-700 transition hover:bg-green-100"
            >
              Save to garage
            </button>

            <button
              type="button"
              onClick={clearVehicle}
              className="inline-flex h-9 items-center justify-center rounded-2xl border border-green-200 bg-green-100 px-3 text-xs font-semibold text-green-700 transition hover:bg-green-200"
            >
              Clear vehicle
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
          No active vehicle selected yet.
        </div>
      )}

      {savedVehicles.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
          No saved vehicles yet.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {savedVehicles.map((vehicle, index) => {
            const key = getVehicleKey(vehicle);
            const isActive = key === activeKey;

            return (
              <div
                key={`${key}-${index}`}
                className={[
                  "flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between",
                  isActive
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200 bg-gray-50",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{vehicle.label}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {isActive ? "Currently active" : "Saved in garage"}
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
