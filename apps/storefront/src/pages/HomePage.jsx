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

  return (
    <section className="space-y-8 pb-16">
      <div className="overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 px-6 py-8 text-white shadow-xl sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              Vehicle-aware auto parts marketplace
            </div>

            <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Discover the marketplace from one place
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
              Start with vehicle selection, browse parts, compare shortlisted items,
              and move to cart or orders from a homepage built around the flows you already have.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/vehicle-selector"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-6 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
              >
                Select vehicle
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
                <span className="font-semibold">Selected vehicle:</span>
                <span>{vehicleLabel}</span>
                <Link
                  to="/parts"
                  className="rounded-xl bg-white/15 px-3 py-1 font-semibold text-white transition hover:bg-white/20"
                >
                  Discover matching parts
                </Link>
                <Link
                  to={`/parts?make=${encodeURIComponent(
                    String(
                      selectedVehicle?.make_name ||
                      selectedVehicle?.makeName ||
                      selectedVehicle?.make ||
                      ""
                    ).toLowerCase()
                  )}&model=${encodeURIComponent(
                    String(
                      selectedVehicle?.model_name ||
                      selectedVehicle?.modelName ||
                      selectedVehicle?.model ||
                      ""
                    ).toLowerCase()
                  )}&year=${encodeURIComponent(String(selectedVehicle?.year || ""))}`}
                  className="rounded-xl bg-white px-3 py-1 font-semibold text-slate-950 transition hover:bg-blue-50"
                >
                  Continue with this vehicle
                </Link>
              </div>
            ) : (
              <div className="mt-6 inline-flex rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-blue-100">
                Start by choosing your vehicle to improve fitment discovery and ranking quality.
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                Pages already available
              </p>
              <div className="mt-4 space-y-3 text-sm text-white/95">
                <p>• Vehicle selector</p>
                <p>• Parts catalog</p>
                <p>• Compare page</p>
                <p>• Cart and checkout</p>
                <p>• Orders and tracking</p>
                <p>• Seller profile pages</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <EntryCard
          title="Find parts by vehicle"
          description="Choose make, model, and year first, then move مباشرة to more relevant discovery."
          to="/vehicle-selector"
          cta="Open vehicle selector"
          tone="blue"
        />

        <EntryCard
          title="Browse the catalog"
          description="Open the marketplace, use filters, inspect compatibility, and shortlist the best listings."
          to="/parts"
          cta="Open parts catalog"
        />

        <EntryCard
          title="Compare saved parts"
          description="Review shortlisted parts side by side before opening details or continuing to checkout."
          to="/compare"
          cta="Open compare"
          tone="green"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Discover storefront pages</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <EntryCard
              title="Vehicle selector"
              description="Select or change your vehicle context."
              to="/vehicle-selector"
              cta="Go there"
            />

            <EntryCard
              title="Parts"
              description="Browse, search, filter, and open part details."
              to="/parts"
              cta="Go there"
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

            <EntryCard
              title="Compare"
              description="Open shortlisted parts side by side."
              to="/compare"
              cta="Open compare"
            />

            <EntryCard
              title="Account"
              description="Access sign-in and buyer account pages."
              to="/account"
              cta="Open account"
            />
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Suggested journeys</h2>
          <div className="mt-5 space-y-4">
            <EntryCard
              title="Best flow: vehicle → parts"
              description="Choose a vehicle first, then browse stronger matches in the catalog."
              to="/vehicle-selector"
              cta="Start this path"
              tone="blue"
            />

            <EntryCard
              title="Popular query path"
              description="Jump into a common search journey and inspect marketplace inventory."
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
