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

export default function HomePage() {
  const vehicleCtx = useSelectedVehicle();
  const selectedVehicle = vehicleCtx?.selectedVehicle || null;
  const vehicleLabel = getVehicleLabel(selectedVehicle);

  return (
    <section className="space-y-8 pb-16">
      <div className="overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 px-6 py-8 text-white shadow-xl sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              Vehicle-aware parts marketplace
            </div>

            <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Find the right auto part with more confidence
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
              Search by keyword, fitment, make, model, and year. Compare listings, verify compatibility,
              and buy from sellers with stronger stock and fitment signals.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/parts"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-6 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
              >
                Browse parts
              </Link>

              <Link
                to="/compare"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Compare shortlisted parts
              </Link>

              <a
                href="https://seller.parthub.local"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Sell parts
              </a>
            </div>

            {selectedVehicle ? (
              <div className="mt-6 inline-flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white">
                <span className="font-semibold">Selected vehicle:</span>
                <span>{vehicleLabel}</span>
                <Link
                  to="/parts"
                  className="rounded-xl bg-white/15 px-3 py-1 font-semibold text-white transition hover:bg-white/20"
                >
                  Search for this vehicle
                </Link>
              </div>
            ) : (
              <div className="mt-6 inline-flex rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-blue-100">
                No vehicle selected yet. Search still works, but exact fitment gets stronger after selecting one.
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                Why PartHub
              </p>
              <div className="mt-4 space-y-3 text-sm text-white/95">
                <p>• Vehicle-aware ranking</p>
                <p>• Compatibility-first discovery</p>
                <p>• Seller trust and stock signals</p>
                <p>• Compare parts side by side</p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                Buyer confidence
              </p>
              <div className="mt-4 space-y-3 text-sm text-white/95">
                <p>• Exact fit badges when available</p>
                <p>• Structured compatibility rows</p>
                <p>• Shortlist and compare flow</p>
                <p>• Guest checkout supported</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Step 1
          </p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">Search with vehicle context</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Add make, model, and year to surface stronger fitment matches and reduce search noise.
          </p>
          <Link
            to="/parts"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Start searching
          </Link>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Step 2
          </p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">Compare before buying</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Shortlist parts and compare price, fitment depth, stock, and seller trust before choosing.
          </p>
          <Link
            to="/compare"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
          >
            Open compare
          </Link>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Step 3
          </p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">Checkout with more clarity</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Keep SKU, vehicle context, and seller notes aligned for stronger purchase confidence.
          </p>
          <Link
            to="/cart"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
          >
            View cart
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">What makes the marketplace stronger</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">Vehicle-aware search</p>
              <p className="mt-2 text-sm text-gray-600">
                Results rank better when fitment data matches your selected vehicle.
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">Compatibility-first inventory</p>
              <p className="mt-2 text-sm text-gray-600">
                Sellers with stronger fitment data help reduce buyer hesitation.
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">Seller trust signals</p>
              <p className="mt-2 text-sm text-gray-600">
                Inventory depth, compatibility, and activity improve perceived reliability.
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">Decision support</p>
              <p className="mt-2 text-sm text-gray-600">
                Shortlist, compare, and confidence messaging make decisions easier.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Marketplace paths</h2>
          <div className="mt-5 space-y-4">
            <Link
              to="/parts"
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 transition hover:bg-white"
            >
              <div>
                <p className="font-semibold text-gray-900">Browse all parts</p>
                <p className="mt-1 text-sm text-gray-500">Start with the catalog and filters</p>
              </div>
              <span className="text-sm font-semibold text-blue-700">Open</span>
            </Link>

            <Link
              to="/compare"
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 transition hover:bg-white"
            >
              <div>
                <p className="font-semibold text-gray-900">Compare saved parts</p>
                <p className="mt-1 text-sm text-gray-500">Review shortlisted parts side by side</p>
              </div>
              <span className="text-sm font-semibold text-blue-700">Open</span>
            </Link>

            <Link
              to="/parts?q=brake"
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 transition hover:bg-white"
            >
              <div>
                <p className="font-semibold text-gray-900">Popular starting search</p>
                <p className="mt-1 text-sm text-gray-500">Explore a common buyer query path</p>
              </div>
              <span className="text-sm font-semibold text-blue-700">Try search</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
