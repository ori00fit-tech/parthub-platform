import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatMoney } from "@parthub/shared";
import { statusLabel, useT } from "../i18n";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function Card({ title, value, subtitle }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>
      {subtitle ? <p className="mt-2 text-sm text-gray-600">{subtitle}</p> : null}
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function RecommendationCard({ tone = "neutral", title, description, ctaLabel, ctaTo }) {
  const toneClasses =
    tone === "success"
      ? "border-green-200 bg-green-50"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : tone === "danger"
      ? "border-red-200 bg-red-50"
      : "border-blue-200 bg-blue-50";

  return (
    <div className={["rounded-3xl border p-5 shadow-sm", toneClasses].join(" ")}>
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-700">{description}</p>

      {ctaLabel && ctaTo ? (
        <Link
          to={ctaTo}
          className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

export default function InsightsPage() {
  const t = useT();
  const [data, setData] = useState({
    seller_stats: {},
    top_demand: [],
    missed_demand: [],
    top_vehicle_demand: [],
    inventory_snapshot: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/api/v1/marketplace/me/insights");
        if (!active) return;

        setData({
          seller_stats: res?.data?.seller_stats || {},
          top_demand: safeArray(res?.data?.top_demand),
          missed_demand: safeArray(res?.data?.missed_demand),
          top_vehicle_demand: safeArray(res?.data?.top_vehicle_demand),
          inventory_snapshot: safeArray(res?.data?.inventory_snapshot),
        });
      } catch (err) {
        if (!active) return;
        setError(err?.message || t("Failed to load insights"));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const stats = data.seller_stats || {};

  const recommendations = useMemo(() => {
    const recs = [];

    const missedDemand = data.missed_demand || [];
    const inventory = data.inventory_snapshot || [];
    const topVehicleDemand = data.top_vehicle_demand || [];

    if (missedDemand.length > 0) {
      const topMiss = missedDemand[0];
      recs.push({
        tone: "warning",
        title: t("High missed demand detected"),
        description: t('Buyers are searching for "{query}" and not finding results. Strong opportunity to add inventory for {vehicle}.', { query: topMiss.query || t("unlabeled part"), vehicle: [topMiss.make_slug || t("target makes"), topMiss.model_slug || t("target models"), topMiss.year].filter(Boolean).join(" / ") }),
        ctaLabel: t("Add matching part"),
        ctaTo: "/parts/create",
      });
    }

    const lowCompatibility = inventory.filter(
      (item) => Number(item.compatibility_count || 0) === 0
    );

    if (lowCompatibility.length > 0) {
      recs.push({
        tone: "danger",
        title: t("Some listings have no compatibility data"),
        description: t("{n} listing(s) currently have zero compatibility rows. These parts may rank weaker and convert worse for vehicle-aware buyers.", { n: lowCompatibility.length }),
        ctaLabel: t("Improve inventory"),
        ctaTo: "/parts",
      });
    }

    const lowStock = inventory.filter((item) => Number(item.quantity || 0) <= 2);

    if (lowStock.length > 0) {
      recs.push({
        tone: "warning",
        title: t("Low stock risk on active inventory"),
        description: t("{n} listing(s) are running low on stock. Replenishing them early reduces missed orders and keeps search coverage stable.", { n: lowStock.length }),
        ctaLabel: t("Review inventory"),
        ctaTo: "/parts",
      });
    }

    if (topVehicleDemand.length > 0) {
      const topVehicle = topVehicleDemand[0];
      recs.push({
        tone: "success",
        title: t("Vehicle niche worth targeting"),
        description: t("One of the strongest buyer demand signals is {vehicle}. Prioritize fitment-rich stock for this vehicle niche.", { vehicle: [topVehicle.make_slug, topVehicle.model_slug, topVehicle.year].filter(Boolean).join(" / ") }),
        ctaLabel: t("Create targeted listing"),
        ctaTo: "/parts/create",
      });
    }

    if (recs.length === 0) {
      recs.push({
        tone: "neutral",
        title: t("No critical recommendation yet"),
        description:
          t("Your insights are loading normally, but there is not enough demand data yet to produce a high-confidence seller recommendation."),
        ctaLabel: t("Add new part"),
        ctaTo: "/parts/create",
      });
    }

    return recs.slice(0, 4);
  }, [data.missed_demand, data.inventory_snapshot, data.top_vehicle_demand, t]);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-700 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">{t("Seller insights")}</h1>
        <p className="mt-3 text-sm text-cyan-100 sm:text-base">
          {t("Understand demand, missed searches, and which vehicle niches are worth stocking.")}
        </p>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-3xl border border-gray-200 bg-white shadow-sm" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card title={t("Total parts")} value={Number(stats.total_parts || 0)} subtitle={t("All seller listings")} />
            <Card title={t("Active parts")} value={Number(stats.active_parts || 0)} subtitle={t("Currently live in the marketplace")} />
            <Card title={t("Pending parts")} value={Number(stats.pending_parts || 0)} subtitle={t("Listings waiting for approval")} />
            <Card title={t("Order items")} value={Number(stats.order_items_count || 0)} subtitle={t("Demand already converted into orders")} />
          </div>

          <Section
            title={t("Recommended actions")}
            subtitle={t("What you should do next based on real marketplace demand signals.")}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {recommendations.map((item, index) => (
                <RecommendationCard
                  key={index}
                  tone={item.tone}
                  title={item.title}
                  description={item.description}
                  ctaLabel={item.ctaLabel}
                  ctaTo={item.ctaTo}
                />
              ))}
            </div>
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section
              title={t("Top buyer demand")}
              subtitle={t("The most common query demand flowing through the marketplace.")}
            >
              {data.top_demand.length === 0 ? (
                <p className="text-sm text-gray-500">{t("No demand signals yet.")}</p>
              ) : (
                <div className="space-y-3">
                  {data.top_demand.map((item, index) => (
                    <div key={`${item.query}-${index}`} className="rounded-2xl bg-gray-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-gray-900">{item.query}</p>
                        <span className="text-sm font-semibold text-gray-700">{t("{n} searches", { n: item.searches })}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {t("Avg. results in market: {n}", { n: Number(item.avg_results || 0).toFixed(1) })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section
              title={t("Missed demand")}
              subtitle={t("Searches with zero results. These are stocking opportunities.")}
            >
              {data.missed_demand.length === 0 ? (
                <p className="text-sm text-gray-500">{t("No missed demand captured yet.")}</p>
              ) : (
                <div className="space-y-3">
                  {data.missed_demand.map((item, index) => (
                    <div key={`${item.query}-${index}`} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-gray-900">{item.query || t("No keyword")}</p>
                        <span className="text-sm font-semibold text-amber-700">{t("{n} misses", { n: item.searches })}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {item.make_slug || t("any make")} • {item.model_slug || t("any model")} • {item.year || t("any year")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section
              title={t("Top vehicle demand")}
              subtitle={t("Vehicle combinations buyers search for most.")}
            >
              {data.top_vehicle_demand.length === 0 ? (
                <p className="text-sm text-gray-500">{t("No vehicle demand data yet.")}</p>
              ) : (
                <div className="space-y-3">
                  {data.top_vehicle_demand.map((item, index) => (
                    <div key={`${item.make_slug}-${item.model_slug}-${item.year}-${index}`} className="rounded-2xl bg-gray-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-gray-900">
                          {item.make_slug} • {item.model_slug} • {item.year || t("year unspecified")}
                        </p>
                        <span className="text-sm font-semibold text-gray-700">{t("{n} searches", { n: item.searches })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section
              title={t("Inventory snapshot")}
              subtitle={t("Recent seller listings and compatibility coverage.")}
            >
              {data.inventory_snapshot.length === 0 ? (
                <p className="text-sm text-gray-500">{t("No inventory found.")}</p>
              ) : (
                <div className="space-y-3">
                  {data.inventory_snapshot.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-gray-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-gray-900">{item.title}</p>
                        <span className="text-sm font-semibold text-gray-700">{statusLabel(item.status)}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {t("stock: {n}", { n: item.quantity })} • {t("price: {price}", { price: formatMoney(item.price) })} • {t("fitment rows: {n}", { n: item.compatibility_count })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </>
      )}
    </section>
  );
}
