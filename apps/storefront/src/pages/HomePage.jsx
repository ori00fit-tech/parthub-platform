import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";

function getVehicleLabel(vehicle) {
  if (!vehicle) return "No vehicle selected";
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

function HeroStat({ value, label, icon }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4 sm:border-b-0 sm:border-r last:border-r-0">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg">
        {icon}
      </div>
      <div>
        <div className="text-lg font-black tracking-tight text-slate-950">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}

function CategoryCard({ icon, title, to }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="text-2xl">{icon}</div>
      <div className="text-sm font-bold text-slate-900">{title}</div>
    </Link>
  );
}

function ProductCard({ brand, title, price, was, fitment, to, badge, icon }) {
  return (
    <Link
      to={to}
      className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="relative flex aspect-square items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        {badge ? (
          <span className="absolute left-3 top-3 rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {badge}
          </span>
        ) : null}
        <div className="text-6xl">{icon}</div>
      </div>
      <div className="p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-600">
          {brand}
        </p>
        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-900">
          {title}
        </h3>
        <div className="mt-3 inline-flex rounded-md border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
          {fitment}
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xl font-black tracking-tight text-slate-950">{price}</p>
            {was ? <p className="text-xs text-gray-400 line-through">{was}</p> : null}
          </div>
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            +
          </div>
        </div>
      </div>
    </Link>
  );
}

function SellerCard({ initials, name, location, rating, sales, to, color }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-black text-white"
        style={{ background: color }}
      >
        {initials}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="font-bold text-slate-900">{name}</p>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
            Verified
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">{location}</p>
        <p className="mt-1 text-xs font-semibold text-amber-600">
          {rating} · {sales} sales
        </p>
      </div>
    </Link>
  );
}

function WhyCard({ icon, title, description, bg }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
        style={{ background: bg }}
      >
        {icon}
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const vehicleCtx = useSelectedVehicle();
  const selectedVehicle = vehicleCtx?.selectedVehicle || null;

  const [activeTab, setActiveTab] = useState("vehicle");
  const [partQuery, setPartQuery] = useState("");
  const [oemQuery, setOemQuery] = useState("");
  const [vinQuery, setVinQuery] = useState("");

  const selectedVehicleLabel = useMemo(
    () => getVehicleLabel(selectedVehicle),
    [selectedVehicle]
  );

  function submitVehicleSearch() {
    if (!selectedVehicle) {
      navigate("/vehicle-selector");
      return;
    }

    const make = String(
      selectedVehicle.make_name || selectedVehicle.makeName || selectedVehicle.make || ""
    ).toLowerCase();
    const model = String(
      selectedVehicle.model_name || selectedVehicle.modelName || selectedVehicle.model || ""
    ).toLowerCase();
    const year = String(selectedVehicle.year || "");

    navigate(
      `/parts?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&year=${encodeURIComponent(year)}`
    );
  }

  function submitPartSearch(e) {
    e.preventDefault();
    navigate(partQuery.trim() ? `/parts?q=${encodeURIComponent(partQuery.trim())}` : "/parts");
  }

  function submitOemSearch(e) {
    e.preventDefault();
    navigate(oemQuery.trim() ? `/parts?q=${encodeURIComponent(oemQuery.trim())}` : "/parts");
  }

  function submitVinSearch(e) {
    e.preventDefault();
    navigate(vinQuery.trim() ? `/parts?q=${encodeURIComponent(vinQuery.trim())}` : "/vehicle-selector");
  }

  const quickCategories = [
    { icon: "⚙️", title: "Engine", to: "/parts?q=engine" },
    { icon: "🛑", title: "Brakes", to: "/parts?q=brake" },
    { icon: "🪫", title: "Electrical", to: "/parts?q=battery" },
    { icon: "🧴", title: "Filters", to: "/parts?q=filter" },
    { icon: "🚘", title: "Suspension", to: "/parts?q=suspension" },
    { icon: "💡", title: "Lighting", to: "/parts?q=light" },
    { icon: "🔥", title: "Exhaust", to: "/parts?q=exhaust" },
    { icon: "⚡", title: "Flash Deals", to: "/parts?sort=price_asc" },
  ];

  return (
    <section className="space-y-10">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-b from-white to-[#f4f6fb] px-4 py-10 text-center sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-blue-700">
            ✓ 2.4M+ Parts · 1,200+ Verified Sellers
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Find the Right Part,
            <br />
            <span className="text-blue-600">Every Time</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-gray-500 sm:text-base">
            Search by vehicle, part name, OEM number, or VIN. Use Garage context and trust signals
            to reach the right listing faster.
          </p>

          <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-xl">
            <div className="grid grid-cols-2 border-b border-gray-200 bg-[#f4f6fb] sm:grid-cols-4">
              {[
                ["vehicle", "By Vehicle"],
                ["part", "By Part Name"],
                ["oem", "OEM / Part #"],
                ["vin", "By VIN"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={[
                    "px-3 py-4 text-sm font-bold transition",
                    activeTab === key
                      ? "border-b-2 border-blue-600 bg-white text-blue-600"
                      : "text-gray-500 hover:text-slate-900",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-5 sm:p-6">
              {activeTab === "vehicle" ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-gray-200 bg-[#f4f6fb] px-4 py-3 text-left">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Year</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedVehicle?.year || "Select Year"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-[#f4f6fb] px-4 py-3 text-left">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Make</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedVehicle?.make_name || selectedVehicle?.makeName || selectedVehicle?.make || "Select Make"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-[#f4f6fb] px-4 py-3 text-left">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Model</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedVehicle?.model_name || selectedVehicle?.modelName || selectedVehicle?.model || "Select Model"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-[#f4f6fb] px-4 py-3 text-left">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Garage</p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                        {selectedVehicle ? selectedVehicleLabel : "Open Garage"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={submitVehicleSearch}
                      className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700"
                    >
                      Search Compatible Parts
                    </button>

                    <Link
                      to="/vehicle-selector"
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-200 px-5 text-sm font-bold text-slate-800 transition hover:bg-gray-50"
                    >
                      {selectedVehicle ? "Change Vehicle" : "Open Garage"}
                    </Link>
                  </div>
                </div>
              ) : null}

              {activeTab === "part" ? (
                <form onSubmit={submitPartSearch} className="space-y-4">
                  <input
                    value={partQuery}
                    onChange={(e) => setPartQuery(e.target.value)}
                    placeholder="e.g. front brake pads, oil filter, alternator…"
                    className="h-12 w-full rounded-2xl border border-gray-200 bg-[#f4f6fb] px-4 text-sm outline-none focus:border-blue-500"
                  />
                  <button className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700">
                    Search Parts
                  </button>
                </form>
              ) : null}

              {activeTab === "oem" ? (
                <form onSubmit={submitOemSearch} className="space-y-4">
                  <input
                    value={oemQuery}
                    onChange={(e) => setOemQuery(e.target.value)}
                    placeholder="e.g. 90915-YZZD2, 04152-YZZA4…"
                    className="h-12 w-full rounded-2xl border border-gray-200 bg-[#f4f6fb] px-4 text-sm outline-none focus:border-blue-500"
                  />
                  <button className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700">
                    Look Up Part Number
                  </button>
                </form>
              ) : null}

              {activeTab === "vin" ? (
                <form onSubmit={submitVinSearch} className="space-y-4">
                  <input
                    value={vinQuery}
                    onChange={(e) => setVinQuery(e.target.value)}
                    placeholder="17-character VIN"
                    maxLength={17}
                    className="h-12 w-full rounded-2xl border border-gray-200 bg-[#f4f6fb] px-4 text-sm tracking-wide outline-none focus:border-blue-500"
                  />
                  <button className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700">
                    Find Parts by VIN
                  </button>
                </form>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 border-t border-gray-200 pt-5 text-xs text-gray-500">
                <span>Popular:</span>
                {["Brake Pads", "Oil Filter", "Spark Plugs", "Alternator", "Shock Absorbers"].map((item) => (
                  <Link
                    key={item}
                    to={`/parts?q=${encodeURIComponent(item)}`}
                    className="rounded-full border border-gray-200 bg-[#f4f6fb] px-3 py-1.5 font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mx-auto grid max-w-4xl border border-gray-200 border-t-0 bg-white shadow-sm sm:grid-cols-3">
            <HeroStat value="2.4M+" label="Parts in catalog" icon="📦" />
            <HeroStat value="1,200+" label="Verified sellers" icon="✅" />
            <HeroStat value="4.9/5" label="Average buyer rating" icon="⭐" />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Browse categories</h2>
            <p className="mt-1 text-sm text-gray-500">Start from a common parts family</p>
          </div>
          <Link to="/parts" className="text-sm font-bold text-blue-600 hover:underline">
            See all
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {quickCategories.map((item) => (
            <CategoryCard key={item.title} {...item} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Featured discovery</h2>
            <p className="mt-1 text-sm text-gray-500">High-intent starting points for buyers</p>
          </div>
          <Link to="/parts" className="text-sm font-bold text-blue-600 hover:underline">
            View all
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ProductCard
            brand="Bosch"
            title="Front Brake Pads Kit"
            price="£38.00"
            was="£42.00"
            fitment="Vehicle compatibility added"
            to="/parts?q=brake"
            badge="Sale"
            icon="🛑"
          />
          <ProductCard
            brand="K&N"
            title="Performance Air Filter"
            price="£24.00"
            was="£29.00"
            fitment="Popular vehicle match"
            to="/parts?q=air%20filter"
            badge="New"
            icon="🧴"
          />
          <ProductCard
            brand="NGK"
            title="Spark Plug Set"
            price="£18.00"
            fitment="Garage-friendly search"
            to="/parts?q=spark%20plug"
            badge="OEM"
            icon="⚡"
          />
          <ProductCard
            brand="Monroe"
            title="Rear Shock Absorber Pair"
            price="£79.00"
            was="£89.00"
            fitment="Compatibility-first listing"
            to="/parts?q=shock"
            icon="🚘"
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Top verified sellers</h2>
              <p className="mt-1 text-sm text-gray-500">Seller trust and storefront discovery</p>
            </div>
          </div>

          <div className="space-y-3">
            <SellerCard
              initials="AP"
              name="AutoParts Pro"
              location="Los Angeles, CA"
              rating="★★★★★ 4.9"
              sales="12,400"
              to="/parts"
              color="linear-gradient(135deg,#0077b6,#00b4d8)"
            />
            <SellerCard
              initials="GS"
              name="GenuineStar"
              location="Detroit, MI"
              rating="★★★★★ 4.8"
              sales="8,900"
              to="/parts"
              color="linear-gradient(135deg,#f4a823,#e85d04)"
            />
            <SellerCard
              initials="QP"
              name="QuickParts"
              location="Chicago, IL"
              rating="★★★★☆ 4.7"
              sales="6,200"
              to="/parts"
              color="linear-gradient(135deg,#2d6a4f,#52b788)"
            />
            <SellerCard
              initials="OE"
              name="OEM Direct"
              location="Houston, TX"
              rating="★★★★★ 4.9"
              sales="21,000"
              to="/parts"
              color="linear-gradient(135deg,#6a0572,#ab83a1)"
            />
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white shadow-xl">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">
              Why PartHub
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">The cleaner buyer journey</h2>
            <p className="mt-2 text-sm leading-6 text-blue-100">
              Fitment-first discovery, verified sellers, tracked orders, and support-oriented flows.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <div className="text-2xl">🔍</div>
              <h3 className="mt-3 font-bold">Vehicle Compatibility Check</h3>
              <p className="mt-2 text-sm text-blue-100">
                Filter discovery by your exact year, make, model, and engine context.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <div className="text-2xl">✅</div>
              <h3 className="mt-3 font-bold">Verified Sellers</h3>
              <p className="mt-2 text-sm text-blue-100">
                Seller trust signals and public storefront access improve buyer confidence.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <div className="text-2xl">🚚</div>
              <h3 className="mt-3 font-bold">Fast Shipping Flow</h3>
              <p className="mt-2 text-sm text-blue-100">
                Cart, checkout, order history, and tracking pages already exist in the storefront.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <div className="text-2xl">🔄</div>
              <h3 className="mt-3 font-bold">Compare Before You Buy</h3>
              <p className="mt-2 text-sm text-blue-100">
                Compare shortlisted parts before opening details or moving to checkout.
              </p>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
