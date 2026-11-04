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
    <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">My garage</h2>
          <p className="mt-1 text-sm text-muted">
            Save vehicles and switch fitment context instantly.
          </p>
        </div>

        {selectedVehicle ? (
          <button
            type="button"
            onClick={() => saveVehicle(selectedVehicle)}
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-navy/20 bg-navy/[0.06] px-4 text-sm font-semibold text-link transition hover:bg-navy/[0.12]"
          >
            Save current
          </button>
        ) : null}
      </div>

      {selectedVehicle ? (
        <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Active vehicle
          </p>
          <p className="mt-1 text-sm font-semibold text-emerald-800">
            {selectedVehicle.label}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => saveVehicle(selectedVehicle)}
              className="inline-flex h-9 items-center justify-center rounded-2xl bg-surface px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-400/20"
            >
              Save to garage
            </button>

            <button
              type="button"
              onClick={clearVehicle}
              className="inline-flex h-9 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/15 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-400/25"
            >
              Clear vehicle
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-line-strong bg-surface-2 p-4 text-sm text-muted">
          No active vehicle selected yet.
        </div>
      )}

      {savedVehicles.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-line-strong bg-surface-2 p-4 text-sm text-muted">
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
                    ? "border-emerald-400/30 bg-emerald-400/10"
                    : "border-line bg-surface-2",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{vehicle.label}</p>
                  <p className="mt-1 text-xs text-muted">
                    {isActive ? "Currently active" : "Saved in garage"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!isActive ? (
                    <button
                      type="button"
                      onClick={() => selectSavedVehicle(vehicle)}
                      className="inline-flex h-10 items-center justify-center rounded-2xl border border-line bg-surface px-4 text-sm font-semibold text-ink-2 transition hover:bg-surface-3"
                    >
                      Use vehicle
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => removeSavedVehicle(vehicle)}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-red-400/30 bg-red-400/10 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-400/20"
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
