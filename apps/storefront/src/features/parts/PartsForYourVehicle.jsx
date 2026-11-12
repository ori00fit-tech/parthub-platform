import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../../lib/api";
import { formatPrice } from "../../lib/formatters";
import { mediaUrl } from "../../lib/media";
import { useSelectedVehicle } from "../vehicles/SelectedVehicleContext";
import { useT } from "../../i18n";
import StockBadge from "../stock/StockBadge";
import { Icon } from "@parthub/shared/icons";

const MAX_CARDS = 4;

function vehicleParams(v) {
  const make = v?.make_name || v?.makeName || v?.make || "";
  const model = v?.model_name || v?.modelName || v?.model || "";
  const params = new URLSearchParams();
  if (make) params.set("make", String(make).toLowerCase());
  if (model) params.set("model", String(model).toLowerCase());
  if (v?.year) params.set("year", String(v.year));
  return { params, make, model };
}

function vehicleLabel(v) {
  if (!v) return "";
  return v.label || [v.year, v.make_name || v.make, v.model_name || v.model].filter(Boolean).join(" ");
}

// Home page: parts verified for the buyer's saved vehicle. Hidden until a
// vehicle is selected; when nothing fits yet, points to "Request a part".
export default function PartsForYourVehicle() {
  const t = useT();
  const { selectedVehicle } = useSelectedVehicle();
  const [parts, setParts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const label = vehicleLabel(selectedVehicle);
  const { params, make, model } = vehicleParams(selectedVehicle);
  const query = params.toString();

  useEffect(() => {
    if (!selectedVehicle || !make) return undefined;
    let active = true;
    setLoading(true);
    apiGet(`/api/v1/search?${query}&fit=only`)
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        setParts(list.slice(0, MAX_CARDS));
        setTotal(Number(res?.meta?.pagination?.total ?? list.length));
      })
      .catch(() => active && setParts([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!selectedVehicle || !make) return null;

  return (
    <section aria-labelledby="for-your-vehicle">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-navy">{t("Your garage")}</p>
          <h2 id="for-your-vehicle" className="mt-1 text-2xl font-black tracking-tight text-ink">
            {t("Parts for your {vehicle}", { vehicle: label })}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("Listings with compatibility data for this vehicle.")}</p>
        </div>
        {total > 0 ? (
          <Link to={`/parts?${query}`} className="text-sm font-semibold text-link hover:underline">
            {t("See all {n}", { n: total })} <span aria-hidden="true" className="inline-block rtl:rotate-180">→</span>
          </Link>
        ) : null}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: MAX_CARDS }, (_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl border border-line bg-surface" />
          ))}
        </div>
      ) : parts.length === 0 ? (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-line-strong bg-surface p-6">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">{t("No parts are listed for your {vehicle} yet.", { vehicle: model || label })}</p>
            <p className="mt-1 text-sm text-muted">
              {t("Send a request and sellers who stock {make} parts can reply with offers.", { make })}
            </p>
          </div>
          <Link to="/request-part" className="btn-cta h-11 rounded-xl px-5 text-sm">
            {t("Request a part")}
          </Link>
          <Link
            to={`/parts?${query}&fit=rank`}
            className="inline-flex h-11 items-center rounded-xl border border-line-strong px-5 text-sm font-semibold text-ink-2 transition hover:bg-surface-3"
          >
            {t("Browse all parts")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {parts.map((part) => (
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
              <div className="flex flex-1 flex-col gap-2 p-3.5">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-navy">{part.brand_name || t("Unbranded")}</p>
                <p dir="auto" className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink">{part.title}</p>
                <span className="inline-flex h-6 w-fit items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 text-xs font-medium text-emerald-700 before:h-1.5 before:w-1.5 before:rounded-full before:bg-current">
                  {model ? t("Fits your {vehicle}", { vehicle: model }) : t("Fits your vehicle")}
                </span>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <p className="font-mono text-lg font-semibold text-ink">{formatPrice(part.price)}</p>
                  <StockBadge quantity={part.quantity} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
