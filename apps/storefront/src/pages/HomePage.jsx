import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";
import PartsForYourVehicle from "../features/parts/PartsForYourVehicle";
import { apiGet } from "../lib/api";
import { formatPrice } from "../lib/formatters";
import { mediaUrl } from "../lib/media";
import StockBadge from "../features/stock/StockBadge";
import { t, useT } from "../i18n";
import { Icon } from "@parthub/shared/icons";
import { usePageMeta } from "../lib/pageMeta";

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
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy/[0.06] text-navy">
        <Icon name={icon} className="h-5 w-5" />
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
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy/[0.07] text-navy">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <div className="text-sm font-bold text-ink">{title}</div>
    </Link>
  );
}




export default function HomePage() {
  const t = useT();
  usePageMeta("PartHub – Pièces auto au Maroc | قطع غيار السيارات", t("Find the right part for your vehicle from verified sellers in Morocco."));
  const navigate = useNavigate();
  const vehicleCtx = useSelectedVehicle();
  const selectedVehicle = vehicleCtx?.selectedVehicle || null;

  const [activeTab, setActiveTab] = useState("vehicle");
  const [partQuery, setPartQuery] = useState("");
  const [oemQuery, setOemQuery] = useState("");
  const [vinQuery, setVinQuery] = useState("");
  const [catalog, setCatalog] = useState({ loading: true, parts: [] });

  // Live catalog: newest/featured active parts (not logged as search demand).
  useEffect(() => {
    let active = true;
    apiGet("/api/v1/catalog/parts")
      .then((res) => active && setCatalog({ loading: false, parts: Array.isArray(res?.data) ? res.data : [] }))
      .catch(() => active && setCatalog({ loading: false, parts: [] }));
    return () => {
      active = false;
    };
  }, []);
  const partCount = catalog.parts.length;
  const latestParts = catalog.parts.slice(0, 4);

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
    { icon: "engine", title: t("Engine"), to: "/parts?q=engine" },
    { icon: "brakes", title: t("Brakes"), to: "/parts?q=brake" },
    { icon: "electrical", title: t("Electrical"), to: "/parts?q=battery" },
    { icon: "filters", title: t("Filters"), to: "/parts?q=filter" },
    { icon: "suspension", title: t("Suspension"), to: "/parts?q=suspension" },
    { icon: "lighting", title: t("Lighting"), to: "/parts?q=light" },
    { icon: "exhaust", title: t("Exhaust"), to: "/parts?q=exhaust" },
    { icon: "lowest-prices", title: t("Lowest prices"), to: "/parts?sort=price_asc" },
  ];

  return (
    <section className="space-y-10">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-b from-surface to-canvas px-4 py-10 text-center sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-navy/20 bg-navy/[0.06] px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-link">
            <Icon name="verified" className="h-4 w-4" />
            {t("Auto parts from Moroccan sellers · Prices in MAD")}
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
            <HeroStat
              value={catalog.loading ? "…" : partCount >= 60 ? "60+" : String(partCount)}
              label={t("Parts listed now")}
              icon="inventory"
            />
            <HeroStat value={t("Reviewed")} label={t("Every store is checked by PartHub")} icon="verified" />
            <HeroStat value={t("WhatsApp")} label={t("Ask the seller before you buy")} icon="whatsapp" />
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

      {latestParts.length ? (
        <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm" aria-labelledby="latest-parts">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 id="latest-parts" className="text-2xl font-black tracking-tight text-ink">{t("Latest parts")}</h2>
              <p className="mt-1 text-sm text-muted">{t("Recently listed by sellers on PartHub")}</p>
            </div>
            <Link to="/parts" className="text-sm font-bold text-link hover:underline">
              {t("View all")}
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {latestParts.map((part) => (
              <Link
                key={part.id}
                to={`/parts/${part.slug}`}
                className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-panel transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift"
              >
                <div className="media-well flex aspect-[4/3] items-center justify-center overflow-hidden border-b border-line">
                  {part.image_url ? (
                    <img src={mediaUrl(part.image_url)} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <Icon name="part" className="h-10 w-10 text-faint" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-3.5">
                  <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-navy">{part.brand_name || t("Unbranded")}</p>
                  <p dir="auto" className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink">{part.title}</p>
                  {part.seller_name ? (
                    <p className="truncate text-xs text-muted">
                      {part.seller_location ? `${part.seller_name} · ${part.seller_location}` : part.seller_name}
                    </p>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <p className="font-mono text-lg font-semibold text-ink">{formatPrice(part.price)}</p>
                    <StockBadge quantity={part.quantity} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="rounded-3xl bg-gradient-to-br from-navy to-blue-700 p-6 text-white shadow-xl">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">
              {t("Why PartHub")}
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">{t("Buy the right part with confidence")}</h2>
            <p className="mt-2 text-sm leading-6 text-blue-100">
              {t("Search by your vehicle, buy from reviewed sellers, and follow your order from your account.")}
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <Icon name="vehicle" className="h-7 w-7 text-blue-100" />
              <h3 className="mt-3 font-bold">{t("Vehicle Compatibility Check")}</h3>
              <p className="mt-2 text-sm text-blue-100">
                {t("Filter by your year, make and model to see the parts that fit.")}
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <Icon name="verified" className="h-7 w-7 text-blue-100" />
              <h3 className="mt-3 font-bold">{t("Verified Sellers")}</h3>
              <p className="mt-2 text-sm text-blue-100">
                {t("PartHub reviews every store before its parts go live.")}
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <Icon name="request-part" className="h-7 w-7 text-blue-100" />
              <h3 className="mt-3 font-bold">{t("Can't find a part?")}</h3>
              <p className="mt-2 text-sm text-blue-100">
                {t("Send one request and sellers reply with offers.")}{" "}
                <Link to="/request-part" className="font-semibold text-white underline underline-offset-2">
                  {t("Request a part")}
                </Link>
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <Icon name="compare" className="h-7 w-7 text-blue-100" />
              <h3 className="mt-3 font-bold">{t("Compare Before You Buy")}</h3>
              <p className="mt-2 text-sm text-blue-100">
                {t("Shortlist parts and compare price, condition and fitment side by side.")}
              </p>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
