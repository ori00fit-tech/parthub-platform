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

function FeatureCard({ title, description }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
    </div>
  );
}

function PathCard({ title, description, to, cta }) {
  return (
    <Link
      to={to}
      className="block rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
              Search smarter. Match better. Buy with more confidence.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
              PartHub helps buyers search by keyword and vehicle, review fitment-ready listings,
              compare shortlisted parts, and buy from sellers with stronger stock and trust signals.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/parts"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-6 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
              >
                Start searching
              </Link>

              <Link
                to="/compare"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Compare parts
              </Link>
            </div>

            {selectedVehicle ? (
              <div className="mt-6 inline-flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white">
                <span className="font-semibold">Selected vehicle:</span>
                <span>{vehicleLabel}</span>
                <Link
                  to="/parts"
                  className="rounded-xl bg-white/15 px-3 py-1 font-semibold text-white transition hover:bg-white/20"
                >
                  Search this vehicle
                </Link>
              </div>
            ) : (
              <div className="mt-6 inline-flex rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-blue-100">
                No vehicle selected yet. Search still works, but fitment ranking becomes stronger after choosing one.
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                What buyers get
              </p>
              <div className="mt-4 space-y-3 text-sm text-white/95">
                <p>• Vehicle-aware ranking</p>
                <p>• Fitment-first discovery</p>
                <p>• Compare flow before buying</p>
                <p>• Seller trust and stock visibility</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <FeatureCard
          title="Search with fitment context"
          description="Use make, model, and year to reduce search noise and surface stronger matches."
        />
        <FeatureCard
          title="Compare before checkout"
          description="Shortlist parts and compare stock, compatibility depth, and pricing side by side."
        />
        <FeatureCard
          title="Trust clearer listings"
          description="Seller credibility, compatibility rows, and stock signals help buyers decide faster."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <PathCard
          title="Browse all parts"
          description="Start with the full catalog and refine results with filters."
          to="/parts"
          cta="Open catalog"
        />

        <PathCard
          title="Open compare"
          description="Review shortlisted parts side by side before choosing."
          to="/compare"
          cta="Compare now"
        />

        <PathCard
          title="Try a common search"
          description="Jump into a typical buyer path and explore active inventory."
          to="/parts?q=brake"
          cta="Search brakes"
        />
      </div>
    </section>
  );
}
