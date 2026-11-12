import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "@parthub/shared/icons";
import { apiGet } from "../lib/api";
import { formatPrice } from "../lib/formatters";
import { mediaUrl } from "../lib/media";
import { usePageMeta } from "../lib/pageMeta";
import { useT } from "../i18n";
import StockBadge from "../features/stock/StockBadge";
import NotFoundPage from "./NotFoundPage";

// Landing pages for search engines and browsing: a part category
// (/pieces/:category), a car make or model (/voiture/:make[/:model]), or a
// category for a model (/voiture/:make/:model/:category). The first load
// gets its title, description and part links from functions/_lib/landing.js.

export function landingPath({ category, make, model }) {
  if (make) return `/voiture/${make}${model ? `/${model}` : ""}${category ? `/${category}` : ""}`;
  return `/pieces/${category}`;
}

function Chips({ title, items, pathOf, labelOf }) {
  if (!items?.length) return null;
  return (
    <section>
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((x) => (
          <li key={x.slug}>
            <Link
              to={pathOf(x)}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink-2 transition hover:border-line-strong hover:bg-surface-3"
            >
              {labelOf(x)}
              <span className="rounded-full bg-surface-3 px-2 text-xs text-muted">{x.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function LandingPage() {
  const t = useT();
  const { category = "", make = "", model = "" } = useParams();
  const [state, setState] = useState({ loading: true, data: null, notFound: false, error: "" });

  useEffect(() => {
    let active = true;
    setState({ loading: true, data: null, notFound: false, error: "" });
    apiGet("/api/v1/catalog/landing", { category, make, model })
      .then((res) => active && setState({ loading: false, data: res?.data || null, notFound: !res?.data, error: "" }))
      .catch((err) => active && setState({ loading: false, data: null, notFound: err?.status === 404, error: err?.message || "" }));
    return () => {
      active = false;
    };
  }, [category, make, model]);

  const d = state.data;
  const car = [d?.make?.name, d?.model?.name].filter(Boolean).join(" ");
  const catName = d?.category ? t(d.category.name) : "";
  const heading = !d
    ? ""
    : catName && car
      ? t("{category} for {vehicle}", { category: catName, vehicle: car })
      : car
        ? t("{vehicle} parts", { vehicle: car })
        : t("{category}: auto parts", { category: catName });
  usePageMeta(heading, d ? t("New and used auto parts from verified sellers in Morocco. Cash on delivery.") : "");

  if (state.notFound) return <NotFoundPage />;

  if (state.loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-28 animate-pulse rounded-3xl bg-surface" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl border border-line bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  if (!d) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
        {state.error || t("Something went wrong. Please try again.")}
      </p>
    );
  }

  const crumbs = [{ label: t("Home"), to: "/" }];
  if (d.make) crumbs.push({ label: d.make.name, to: landingPath({ make: d.make.slug }) });
  if (d.model) crumbs.push({ label: d.model.name, to: landingPath({ make: d.make.slug, model: d.model.slug }) });
  if (d.category) crumbs.push({ label: catName, to: landingPath({ make: d.make?.slug, model: d.model?.slug, category: d.category.slug }) });

  // Full search with filters for this scope.
  const searchParams = new URLSearchParams();
  if (d.category) searchParams.set("category", d.category.slug);
  const searchLink = `/parts${searchParams.toString() ? `?${searchParams}` : ""}`;

  return (
    <div className="space-y-8 pb-10">
      <nav aria-label={t("Breadcrumb")} className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          {crumbs.map((c, i) => (
            <li key={c.to} className="flex items-center gap-1.5">
              {i > 0 ? <span aria-hidden="true">/</span> : null}
              {i < crumbs.length - 1 ? (
                <Link to={c.to} className="hover:text-ink hover:underline">{c.label}</Link>
              ) : (
                <span aria-current="page" className="font-semibold text-ink">{c.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <header className="rounded-3xl border border-line bg-surface p-6 shadow-panel sm:p-8">
        <h1 className="text-3xl font-black tracking-tight text-ink sm:text-4xl">{heading}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {d.total
            ? t("{n} parts from verified sellers in Morocco, new and used. Check the fit with your car, pay on delivery.", { n: d.total })
            : t("No parts are listed here yet. Send a request: sellers reply with their offers.")}
        </p>
        {d.generations?.length ? (
          <p className="mt-3 text-sm text-ink-2">
            <span className="font-semibold">{t("Generations")}:</span>{" "}
            {d.generations.map((g) => `${g.name} (${g.year_start}–${g.year_end || "…"})`).join(" · ")}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          {d.make ? (
            <Link to="/vehicle-selector" className="btn-cta h-11 rounded-xl px-5 text-sm">
              {t("Choose your exact car")}
            </Link>
          ) : null}
          <Link to={searchLink} className="inline-flex h-11 items-center rounded-xl border border-line-strong px-5 text-sm font-semibold text-ink-2 transition hover:bg-surface-3">
            {t("Search with filters")}
          </Link>
          <Link to="/request-part" className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-semibold text-link hover:underline">
            {t("Request a part")}
          </Link>
        </div>
      </header>

      <Chips
        title={t("Models")}
        items={d.models}
        pathOf={(m) => landingPath({ make: d.make.slug, model: m.slug })}
        labelOf={(m) => `${d.make.name} ${m.name}`}
      />
      <Chips
        title={t("Car makes")}
        items={d.makes}
        pathOf={(m) => landingPath({ make: m.slug, category: d.category?.slug })}
        labelOf={(m) => m.name}
      />
      <Chips
        title={t("Categories")}
        items={d.categories}
        pathOf={(c) => (d.make ? landingPath({ make: d.make.slug, model: d.model?.slug, category: c.slug }) : landingPath({ category: c.slug }))}
        labelOf={(c) => t(c.name)}
      />

      {d.parts?.length ? (
        <section aria-labelledby="landing-parts">
          <h2 id="landing-parts" className="text-lg font-bold text-ink">
            {car ? t("Parts for {vehicle}", { vehicle: car }) : t("Available parts")}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {d.parts.map((part) => (
              <Link
                key={part.id}
                to={`/parts/${part.slug}`}
                className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-panel transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift"
              >
                <div className="media-well flex aspect-[4/3] items-center justify-center overflow-hidden border-b border-line">
                  {part.image_url ? (
                    <img src={mediaUrl(part.image_url)} alt={part.title} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <Icon name="part" className="h-10 w-10 text-faint" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3.5">
                  <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-navy">{part.brand_name || t("Unbranded")}</p>
                  <h3 dir="auto" className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink">{part.title}</h3>
                  {part.seller_location ? <p className="text-xs text-muted">{part.seller_name} · {part.seller_location}</p> : null}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <p className="font-mono text-lg font-semibold text-ink">{formatPrice(part.price)}</p>
                    <StockBadge quantity={part.quantity} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {/* The search page filters by category; for a car it uses the buyer's garage. */}
          {d.total > d.parts.length && !d.make ? (
            <p className="mt-4 text-sm">
              <Link to={searchLink} className="font-semibold text-link hover:underline">
                {t("See all {n}", { n: d.total })}
              </Link>
            </p>
          ) : null}
        </section>
      ) : (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-line-strong bg-surface p-6">
          <p className="min-w-0 flex-1 text-sm text-muted">{t("Can't find it? Sellers reply to part requests")}</p>
          <Link to="/request-part" className="btn-cta h-11 rounded-xl px-5 text-sm">
            {t("Request a part")}
          </Link>
        </div>
      )}
    </div>
  );
}
