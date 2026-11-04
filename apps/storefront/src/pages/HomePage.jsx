import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";
import PartsForYourVehicle from "../features/parts/PartsForYourVehicle";
import { t, useT } from "../i18n";

function getVehicleLabel(vehicle) {
  if (!vehicle) return t("No vehicle selected");
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
    <div className="flex items-center gap-3 border-b border-line px-5 py-4 sm:border-b-0 sm:border-e last:border-e-0">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy/[0.06] text-lg">
        {icon}
      </div>
      <div>
        <div className="text-lg font-black tracking-tight text-ink">{value}</div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}

function CategoryCard({ icon, title, to }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-navy hover:shadow-md"
    >
      <div className="text-2xl">{icon}</div>
      <div className="text-sm font-bold text-ink">{title}</div>
    </Link>
  );
}

function ProductCard({ brand, title, price, was, fitment, to, badge, icon }) {
  return (
    <Link
      to={to}
      className="group overflow-hidden rounded-3xl border border-line bg-surface shadow-panel transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift"
    >
      <div className="relative flex aspect-square items-center justify-center bg-gradient-to-br from-surface-2 to-surface-2">
        {badge ? (
          <span className="absolute start-3 top-3 rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {badge}
          </span>
        ) : null}
        <div className="text-6xl">{icon}</div>
      </div>
      <div className="p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-link">
          {brand}
        </p>
        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-ink">
          {title}
        </h3>
        <div className="mt-3 inline-flex rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
          {fitment}
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xl font-black tracking-tight text-ink">{price}</p>
            {was ? <p className="text-xs text-faint line-through">{was}</p> : null}
          </div>
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line-strong text-muted transition group-hover:border-link group-hover:text-link" aria-hidden="true">
            →
          </div>
        </div>
      </div>
    </Link>
  );
}

function SellerCard({ initials, name, location, rating, sales, to, color }) {
  const t = useT();
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-navy hover:shadow-md"
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-black text-white"
        style={{ background: color }}
      >
        {initials}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="font-bold text-ink">{name}</p>
          <span className="rounded-full bg-navy/[0.06] px-2 py-0.5 text-[10px] font-bold text-link">
            {t("Verified")}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">{location}</p>
        <p className="mt-1 text-xs font-semibold text-amber-700">
          {rating} · {sales} sales
        </p>
      </div>
    </Link>
  );
}

function WhyCard({ icon, title, description, bg }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
        style={{ background: bg }}
      >
        {icon}
      </div>
      <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

export default function HomePage() {
  const t = useT();
  const navigate = useNavigate();
  const vehicleCtx = useSelectedVehicle();
  const selectedVehicle = vehicleCtx?.selectedVehicle || null;

  const [activeTab, setActiveTab] = useState("vehicle");
  const [partQuery, setPartQuery] = useState("");
  const [oemQuery, setOemQuery] = useState("");
  const [vinQuery, setVinQuery] = useState("");

  const selectedVehicleLabel = useMemo(
    () => getVehicleLabel(selectedVehicle),
    [selectedVehicle, t]
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
    { icon: "⚙️", title: t("Engine"), to: "/parts?q=engine" },
    { icon: "🛑", title: t("Brakes"), to: "/parts?q=brake" },
    { icon: "🪫", title: t("Electrical"), to: "/parts?q=battery" },
    { icon: "🧴", title: t("Filters"), to: "/parts?q=filter" },
    { icon: "🚘", title: t("Suspension"), to: "/parts?q=suspension" },
    { icon: "💡", title: t("Lighting"), to: "/parts?q=light" },
    { icon: "🔥", title: t("Exhaust"), to: "/parts?q=exhaust" },
    { icon: "⚡", title: t("Flash Deals"), to: "/parts?sort=price_asc" },
  ];

  return (
    <section className="space-y-10">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-b from-surface to-canvas px-4 py-10 text-center sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-navy/20 bg-navy/[0.06] px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-link">
            {t("✓ 2.4M+ Parts · 1,200+ Verified Sellers")}
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight text-ink sm:text-5xl">
            {t("Find the Right Part,")}
            <br />
            <span className="text-link">{t("Every Time")}</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
            {t("Search by vehicle, part name, OEM number, or VIN. Use Garage context and trust signals to reach the right listing faster.")}
          </p>

          <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-[22px] border border-line bg-surface shadow-xl">
            <div className="grid grid-cols-2 border-b border-line bg-canvas sm:grid-cols-4">
              {[
                ["vehicle", t("By Vehicle")],
                ["part", t("By Part Name")],
                ["oem", t("OEM / Part #")],
                ["vin", t("By VIN")],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={[
                    "px-3 py-4 text-sm font-bold transition",
                    activeTab === key
                      ? "border-b-2 border-sky-400 bg-surface text-link"
                      : "text-muted hover:text-ink",
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
                    <div className="rounded-xl border border-line bg-canvas px-4 py-3 text-start">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-faint">{t("Year")}</p>
                      <p className="mt-1 text-sm font-semibold text-ink">
                        {selectedVehicle?.year || t("Select Year")}
                      </p>
                    </div>
                    <div className="rounded-xl border border-line bg-canvas px-4 py-3 text-start">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-faint">{t("Make")}</p>
                      <p className="mt-1 text-sm font-semibold text-ink">
                        {selectedVehicle?.make_name || selectedVehicle?.makeName || selectedVehicle?.make || t("Select Make")}
                      </p>
                    </div>
                    <div className="rounded-xl border border-line bg-canvas px-4 py-3 text-start">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-faint">{t("Model")}</p>
                      <p className="mt-1 text-sm font-semibold text-ink">
                        {selectedVehicle?.model_name || selectedVehicle?.modelName || selectedVehicle?.model || t("Select Model")}
                      </p>
                    </div>
                    <div className="rounded-xl border border-line bg-canvas px-4 py-3 text-start">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-faint">{t("Garage")}</p>
                      <p className="mt-1 truncate text-sm font-semibold text-ink">
                        {selectedVehicle ? selectedVehicleLabel : t("Open Garage")}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={submitVehicleSearch}
                      className="btn-cta h-12 flex-1 rounded-2xl px-5 text-sm"
                    >
                      {t("Search Compatible Parts")}
                    </button>

                    <Link
                      to="/vehicle-selector"
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-line px-5 text-sm font-bold text-ink-2 transition hover:bg-surface-3"
                    >
                      {selectedVehicle ? t("Change Vehicle") : t("Open Garage")}
                    </Link>
                  </div>
                </div>
              ) : null}

              {activeTab === "part" ? (
                <form onSubmit={submitPartSearch} className="space-y-4">
                  <input
                    value={partQuery}
                    onChange={(e) => setPartQuery(e.target.value)}
                    placeholder={t("e.g. front brake pads, oil filter, alternator…")}
                    className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm outline-none focus:border-sky-400"
                  />
                  <button className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-navy px-5 text-sm font-bold text-white transition hover:bg-navy-deep">
                    {t("Search Parts")}
                  </button>
                </form>
              ) : null}

              {activeTab === "oem" ? (
                <form onSubmit={submitOemSearch} className="space-y-4">
                  <input
                    value={oemQuery}
                    onChange={(e) => setOemQuery(e.target.value)}
                    placeholder={t("e.g. 90915-YZZD2, 04152-YZZA4…")}
                    className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm outline-none focus:border-sky-400"
                  />
                  <button className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-navy px-5 text-sm font-bold text-white transition hover:bg-navy-deep">
                    {t("Look Up Part Number")}
                  </button>
                </form>
              ) : null}

              {activeTab === "vin" ? (
                <form onSubmit={submitVinSearch} className="space-y-4">
                  <input
                    value={vinQuery}
                    onChange={(e) => setVinQuery(e.target.value)}
                    placeholder={t("17-character VIN")}
                    maxLength={17}
                    className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-sm tracking-wide outline-none focus:border-sky-400"
                  />
                  <button className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-navy px-5 text-sm font-bold text-white transition hover:bg-navy-deep">
                    {t("Find Parts by VIN")}
                  </button>
                </form>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 border-t border-line pt-5 text-xs text-muted">
                <span>{t("Popular:")}</span>
                {[t("Brake Pads"), t("Oil Filter"), t("Spark Plugs"), t("Alternator"), t("Shock Absorbers")].map((item) => (
                  <Link
                    key={item}
                    to={`/parts?q=${encodeURIComponent(item)}`}
                    className="rounded-full border border-line bg-canvas px-3 py-1.5 font-semibold text-ink-2 transition hover:border-navy hover:bg-navy/[0.12] hover:text-blue-800"
                  >
                    {t(item)}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mx-auto grid max-w-4xl border border-line border-t-0 bg-surface shadow-sm sm:grid-cols-3">
            <HeroStat value="2.4M+" label={t("Parts in catalog")} icon="📦" />
            <HeroStat value="1,200+" label={t("Verified sellers")} icon="✅" />
            <HeroStat value="4.9/5" label={t("Average buyer rating")} icon="⭐" />
          </div>
        </div>
      </section>

      <PartsForYourVehicle />

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-ink">{t("Browse categories")}</h2>
            <p className="mt-1 text-sm text-muted">{t("Start from a common parts family")}</p>
          </div>
          <Link to="/parts" className="text-sm font-bold text-link hover:underline">
            {t("See all")}
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {quickCategories.map((item) => (
            <CategoryCard key={item.title} {...item} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-ink">{t("Featured discovery")}</h2>
            <p className="mt-1 text-sm text-muted">{t("High-intent starting points for buyers")}</p>
          </div>
          <Link to="/parts" className="text-sm font-bold text-link hover:underline">
            {t("View all")}
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ProductCard
            brand="Bosch"
            title={t("Front Brake Pads Kit")}
            price="380,00 MAD"
            was="450,00 MAD"
            fitment={t("Vehicle compatibility added")}
            to="/parts?q=brake"
            badge={t("Sale")}
            icon="🛑"
          />
          <ProductCard
            brand="K&N"
            title={t("Performance Air Filter")}
            price="190,00 MAD"
            was="240,00 MAD"
            fitment={t("Popular vehicle match")}
            to="/parts?q=air%20filter"
            badge={t("New")}
            icon="🧴"
          />
          <ProductCard
            brand="NGK"
            title={t("Spark Plug Set")}
            price="160,00 MAD"
            fitment={t("Garage-friendly search")}
            to="/parts?q=spark%20plug"
            badge="OEM"
            icon="⚡"
          />
          <ProductCard
            brand="Monroe"
            title={t("Rear Shock Absorber Pair")}
            price="690,00 MAD"
            was="790,00 MAD"
            fitment={t("Compatibility-first listing")}
            to="/parts?q=shock"
            icon="🚘"
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-ink">{t("Top verified sellers")}</h2>
              <p className="mt-1 text-sm text-muted">{t("Seller trust and storefront discovery")}</p>
            </div>
          </div>

          <div className="space-y-3">
            <SellerCard
              initials="AP"
              name="AutoParts Pro"
              location="Casablanca"
              rating="★★★★★ 4.9"
              sales="12,400"
              to="/parts"
              color="linear-gradient(135deg,#0077b6,#00b4d8)"
            />
            <SellerCard
              initials="GS"
              name="GenuineStar"
              location="Rabat"
              rating="★★★★★ 4.8"
              sales="8,900"
              to="/parts"
              color="linear-gradient(135deg,#f4a823,#e85d04)"
            />
            <SellerCard
              initials="QP"
              name="QuickParts"
              location="Tanger"
              rating="★★★★☆ 4.7"
              sales="6,200"
              to="/parts"
              color="linear-gradient(135deg,#2d6a4f,#52b788)"
            />
            <SellerCard
              initials="OE"
              name="OEM Direct"
              location="Marrakech"
              rating="★★★★★ 4.9"
              sales="21,000"
              to="/parts"
              color="linear-gradient(135deg,#6a0572,#ab83a1)"
            />
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-navy to-blue-700 p-6 text-white shadow-xl">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">
              {t("Why PartHub")}
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">{t("The cleaner buyer journey")}</h2>
            <p className="mt-2 text-sm leading-6 text-blue-100">
              {t("Fitment-first discovery, verified sellers, tracked orders, and support-oriented flows.")}
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <div className="text-2xl">🔍</div>
              <h3 className="mt-3 font-bold">{t("Vehicle Compatibility Check")}</h3>
              <p className="mt-2 text-sm text-blue-100">
                {t("Filter discovery by your exact year, make, model, and engine context.")}
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <div className="text-2xl">✅</div>
              <h3 className="mt-3 font-bold">{t("Verified Sellers")}</h3>
              <p className="mt-2 text-sm text-blue-100">
                {t("Seller trust signals and public storefront access improve buyer confidence.")}
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <div className="text-2xl">🚚</div>
              <h3 className="mt-3 font-bold">{t("Fast Shipping Flow")}</h3>
              <p className="mt-2 text-sm text-blue-100">
                {t("Cart, checkout, order history, and tracking pages already exist in the storefront.")}
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <div className="text-2xl">🔄</div>
              <h3 className="mt-3 font-bold">{t("Compare Before You Buy")}</h3>
              <p className="mt-2 text-sm text-blue-100">
                {t("Compare shortlisted parts before opening details or moving to checkout.")}
              </p>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
