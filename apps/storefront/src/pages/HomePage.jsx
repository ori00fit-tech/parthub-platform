import { Link } from "react-router-dom";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";

function getVehicleLabel(vehicle) {
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

function EntryCard({ title, description, to, cta, tone = "default" }) {
  const tones = {
    default: "border-gray-200 bg-white",
    blue: "border-blue-200 bg-blue-50",
    green: "border-green-200 bg-green-50",
  };

  return (
    <Link
      to={to}
      className={[
        "block rounded-3xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        tones[tone] || tones.default,
      ].join(" ")}
    >
      <h3 className="text-xl font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
      <p className="mt-5 text-sm font-semibold text-blue-700">{cta}</p>
    </Link>
  );
}

export default function HomePage() {
  const vehicleCtx = useSelectedVehicle();
  const selectedVehicle = vehicleCtx?.selectedVehicle || null;
  const vehicleLabel = getVehicleLabel(selectedVehicle);

  const selectedMake = String(
    selectedVehicle?.make_name ||
      selectedVehicle?.makeName ||
      selectedVehicle?.make ||
      ""
  ).toLowerCase();

  const selectedModel = String(
    selectedVehicle?.model_name ||
      selectedVehicle?.modelName ||
      selectedVehicle?.model ||
      ""
  ).toLowerCase();

  const selectedYear = String(selectedVehicle?.year || "");

  const continueVehicleHref =
    selectedVehicle && selectedMake && selectedModel && selectedYear
      ? `/parts?make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(
          selectedModel
        )}&year=${encodeURIComponent(selectedYear)}`
      : "/parts";

  return (
    <section className="space-y-8 pb-16">
      <div className="overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 px-6 py-8 text-white shadow-xl sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              Vehicle-aware auto parts marketplace
            </div>

            <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Start from your Garage, then discover matching parts faster
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
              Keep your current vehicle in Garage, browse parts with stronger fitment context,
              compare shortlisted items, and continue shopping with more confidence.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/vehicle-selector"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-6 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
              >
                Open Garage
              </Link>

              <Link
                to="/parts"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Browse parts
              </Link>

              <Link
                to="/compare"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Compare parts
              </Link>
            </div>

            {selectedVehicle ? (
              <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white">
                <span className="font-semibold">Garage vehicle:</span>
                <span>{vehicleLabel}</span>

                <Link
                  to={continueVehicleHref}
                  className="rounded-xl bg-white px-3 py-1 font-semibold text-slate-950 transition hover:bg-blue-50"
                >
                  Continue with this vehicle
                </Link>

                <Link
                  to="/vehicle-selector"
                  className="rounded-xl bg-white/15 px-3 py-1 font-semibold text-white transition hover:bg-white/20"
                >
                  Change Garage vehicle
                </Link>
              </div>
            ) : (
              <div className="mt-6 inline-flex rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-blue-100">
                No vehicle saved in Garage yet. Add one first to improve fitment discovery.
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                Garage flow
              </p>
              <div className="mt-4 space-y-3 text-sm text-white/95">
                <p>• Save your current vehicle</p>
                <p>• Search with fitment context</p>
                <p>• Compare shortlisted parts</p>
                <p>• Continue shopping faster next time</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <EntryCard
          title="Open Garage"
          description="Save, review, or change your current vehicle before searching the marketplace."
          to="/vehicle-selector"
          cta="Go to Garage"
          tone="blue"
        />

        <EntryCard
          title="Browse the catalog"
          description="Search, filter, inspect fitment, and open part details from the marketplace."
          to="/parts"
          cta="Open parts catalog"
        />

        <EntryCard
          title="Compare saved parts"
          description="Review shortlisted parts side by side before opening details or buying."
          to="/compare"
          cta="Open compare"
          tone="green"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Use Garage as your starting point</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <EntryCard
              title="Garage"
              description="Manage the vehicle you want to shop for right now."
              to="/vehicle-selector"
              cta="Open Garage"
              tone="blue"
            />

            <EntryCard
              title="Parts for your vehicle"
              description="Open discovery with your current vehicle context applied."
              to={continueVehicleHref}
              cta={selectedVehicle ? "Continue with saved vehicle" : "Browse parts"}
            />

            <EntryCard
              title="Cart"
              description="Review selected parts before checkout."
              to="/cart"
              cta="Open cart"
            />

            <EntryCard
              title="Orders"
              description="Review order history and tracking pages."
              to="/orders"
              cta="Open orders"
            />
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Suggested journeys</h2>

          <div className="mt-5 space-y-4">
            <EntryCard
              title="Best path: Garage → parts"
              description="Choose or confirm your vehicle first, then browse better-ranked matches."
              to="/vehicle-selector"
              cta="Start from Garage"
              tone="blue"
            />

            <EntryCard
              title="Popular search path"
              description="Jump into a common buyer query and inspect active inventory."
              to="/parts?q=brake"
              cta="Try brake search"
            />

            <EntryCard
              title="Decision path"
              description="Use compare after shortlisting parts to reduce hesitation before buying."
              to="/compare"
              cta="Review shortlist"
              tone="green"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
