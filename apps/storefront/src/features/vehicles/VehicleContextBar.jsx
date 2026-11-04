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
      <div className="rounded-3xl border border-navy/20 bg-navy/[0.06] px-4 py-4 text-sm text-link shadow-sm">
        Select and save a vehicle to unlock faster fitment-aware shopping.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-faint">
            Vehicle context
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {selectedVehicle ? selectedVehicle.label : "No active vehicle selected"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedVehicle ? (
            <>
              <button
                type="button"
                onClick={() => saveVehicle(selectedVehicle)}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-navy/20 bg-navy/[0.06] px-4 text-sm font-semibold text-link transition hover:bg-navy/[0.12]"
              >
                Save vehicle
              </button>

              <button
                type="button"
                onClick={clearVehicle}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-line bg-surface px-4 text-sm font-semibold text-ink-2 transition hover:bg-surface-3"
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
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-line bg-surface-2 px-4 text-sm font-semibold text-ink-2 transition hover:bg-surface-3"
            >
              {vehicle.year} {vehicle.make_name || vehicle.make}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
