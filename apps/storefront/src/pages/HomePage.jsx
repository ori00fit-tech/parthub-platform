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

function QuickCategoryCard({ icon, title, subtitle, to }) {
  return (
    <Link
      to={to}
      className="group rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="text-3xl">{icon}</div>
      <h3 className="mt-3 text-base font-bold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      <p className="mt-4 text-sm font-semibold text-blue-700">Explore</p>
    </Link>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
    </div>
  );
}

function JourneyCard({ eyebrow, title, description, to, cta, tone = "default" }) {
  const tones = {
    default: "border-gray-200 bg-white",
    blue: "border-blue-200 bg-blue-50",
    green: "border-green-200 bg-green-50",
    amber: "border-amber-200 bg-amber-50",
  };

  return (
    <Link
      to={to}
      className={[
        "block rounded-3xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        tones[tone] || tones.default,
      ].join(" ")}
    >
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {eyebrow}
        </p>
      ) : null}
      <h3 className="mt-2 text-xl font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
      <p className="mt-5 text-sm font-semibold text-blue-700">{cta}</p>
    </Link>
  );
}

function SellerCard({ title, subtitle, to, badge }) {
  return (
    <Link
      to={to}
      className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        {badge ? (
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-sm font-semibold text-blue-700">Open seller page</p>
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
      <div className="rounded-3xl bg-slate-950 px-4 py-2 text-center text-xs font-medium text-slate-200 shadow-sm sm:px-6">
        Vehicle-aware marketplace • Compare parts • Seller trust • Guest checkout
      </div>

      <div className="overflow-hidden rounded-[36px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 text-white shadow-2xl">
        <div className="grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-12">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/90">
              PartHub Marketplace
            </div>

            <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Find the right part faster.
              <br />
              Compare smarter.
              <br />
              Buy with confidence.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
              Search by vehicle, explore the catalog, compare shortlisted parts,
              and buy from sellers with clearer stock, fitment, and trust signals.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
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
              <div className="mt-7 rounded-3xl border border-white/15 bg-white/10 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                      Garage vehicle
                    </p>
                    <p className="mt-1 text-lg font-bold text-white">{vehicleLabel}</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      to={continueVehicleHref}
                      className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
                    >
                      Continue with this vehicle
                    </Link>

                    <Link
                      to="/vehicle-selector"
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15"
                    >
                      Change vehicle
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-7 rounded-3xl border border-white/15 bg-white/10 p-4 sm:p-5">
                <p className="text-sm text-blue-100">
                  No vehicle saved in Garage yet. Start there to unlock stronger fitment discovery.
                </p>
                <Link
                  to="/vehicle-selector"
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
                >
                  Choose your vehicle
                </Link>
              </div>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-3xl font-black text-white">Vehicle-first</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-blue-100">
                  discovery flow
                </p>
              </div>
              <div>
                <p className="text-3xl font-black text-white">Compare-ready</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-blue-100">
                  shortlist flow
                </p>
              </div>
              <div>
                <p className="text-3xl font-black text-white">Trust-focused</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-blue-100">
                  buyer journey
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                  Quick vehicle finder
                </p>
                <h2 className="mt-1 text-2xl font-bold text-white">
                  Start from Garage
                </h2>
              </div>

              <div className="rounded-2xl bg-white/10 px-3 py-2 text-2xl">🚗</div>
            </div>

            <p className="mt-3 text-sm leading-6 text-blue-100">
              Open your Garage to set or update the vehicle that should guide fitment-aware discovery.
            </p>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/90">
                Year, make, model, and engine context
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/90">
                Better search relevance and match ranking
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/90">
                Faster path to compatible inventory
              </div>
            </div>

            <Link
              to="/vehicle-selector"
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-cyan-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Open Garage now
            </Link>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                Current status
              </p>
              <p className="mt-2 text-sm text-white">
                {selectedVehicle ? vehicleLabel : "No Garage vehicle saved yet"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900 shadow-sm">
          🚚 Fast shipping-ready discovery
        </div>
        <div className="rounded-3xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-900 shadow-sm">
          ✅ Seller and stock trust signals
        </div>
        <div className="rounded-3xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-900 shadow-sm">
          🔍 Fitment-aware browsing
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-900 shadow-sm">
          🧾 Cart, checkout, and orders flow
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Shop faster
            </p>
            <h2 className="mt-1 text-3xl font-black text-gray-900">Popular entry points</h2>
          </div>

          <Link to="/parts" className="text-sm font-semibold text-blue-700 hover:underline">
            View all parts
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickCategoryCard
            icon="🛑"
            title="Brakes"
            subtitle="Start with a common buyer category"
            to="/parts?q=brake"
          />
          <QuickCategoryCard
            icon="🌬️"
            title="Filters"
            subtitle="Explore search-driven inventory"
            to="/parts?q=filter"
          />
          <QuickCategoryCard
            icon="⚙️"
            title="Engine parts"
            subtitle="Open a broader discovery path"
            to="/parts?q=engine"
          />
          <QuickCategoryCard
            icon="🔋"
            title="Electrical"
            subtitle="Start another high-intent query"
            to="/parts?q=battery"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <JourneyCard
          eyebrow="Step 1"
          title="Open Garage first"
          description="Set your current vehicle before browsing to get stronger fitment context and cleaner results."
          to="/vehicle-selector"
          cta="Go to Garage"
          tone="blue"
        />

        <JourneyCard
          eyebrow="Step 2"
          title="Browse and shortlist"
          description="Search the catalog, inspect cards, and shortlist promising parts before opening details."
          to="/parts"
          cta="Open catalog"
        />

        <JourneyCard
          eyebrow="Step 3"
          title="Compare before buying"
          description="Use compare to review shortlisted parts side by side before cart or checkout."
          to="/compare"
          cta="Open compare"
          tone="green"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Marketplace discovery
              </p>
              <h2 className="mt-1 text-3xl font-black text-gray-900">
                Pages you can use right now
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <JourneyCard
              title="Garage"
              description="Select, review, or change the vehicle used for discovery."
              to="/vehicle-selector"
              cta="Open Garage"
              tone="blue"
            />

            <JourneyCard
              title="Parts catalog"
              description="Browse search results, filters, badges, and fitment-aware cards."
              to="/parts"
              cta="Open parts"
            />

            <JourneyCard
              title="Compare page"
              description="Review shortlisted parts side by side before deciding."
              to="/compare"
              cta="Open compare"
              tone="green"
            />

            <JourneyCard
              title="Cart"
              description="Review selected parts before going to checkout."
              to="/cart"
              cta="Open cart"
            />

            <JourneyCard
              title="Orders"
              description="Access order history and order tracking pages."
              to="/orders"
              cta="Open orders"
            />

            <JourneyCard
              title="Account"
              description="Use sign-in and account-related buyer pages."
              to="/account"
              cta="Open account"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Why PartHub feels stronger
            </p>
            <h2 className="mt-1 text-3xl font-black text-gray-900">
              Cleaner buyer journey
            </h2>

            <div className="mt-5 grid gap-4">
              <FeatureCard
                icon="🚗"
                title="Garage-first context"
                description="Your vehicle can guide search and improve relevance before you even open a part page."
              />
              <FeatureCard
                icon="📊"
                title="Comparison-ready flow"
                description="Shortlisting and compare reduce hesitation before checkout."
              />
              <FeatureCard
                icon="🛡️"
                title="Trust-oriented discovery"
                description="Stock, compatibility, and seller signals help the buyer decide faster."
              />
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Seller discovery
                </p>
                <h2 className="mt-1 text-2xl font-black text-gray-900">
                  Explore seller storefronts
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <SellerCard
                title="Seller profile pages"
                subtitle="Browse inventory and trust signals from public seller pages."
                to="/parts"
                badge="Trust-ready"
              />
              <SellerCard
                title="Parts with seller context"
                subtitle="Open parts first, then jump to seller storefronts from listing pages."
                to="/parts"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
