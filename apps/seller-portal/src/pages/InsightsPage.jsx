import { useEffect, useState } from "react";
import { api } from "../lib/api";

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

export default function InsightsPage() {
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
        setError(err?.message || "Failed to load insights");
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

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-700 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">Seller insights</h1>
        <p className="mt-3 text-sm text-cyan-100 sm:text-base">
          Understand demand, missed searches, and which vehicle niches are worth stocking.
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
            <Card title="Total parts" value={Number(stats.total_parts || 0)} subtitle="All seller listings" />
            <Card title="Active parts" value={Number(stats.active_parts || 0)} subtitle="Currently live in the marketplace" />
            <Card title="Pending parts" value={Number(stats.pending_parts || 0)} subtitle="Listings waiting for approval" />
            <Card title="Order items" value={Number(stats.order_items_count || 0)} subtitle="Demand already converted into orders" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section
              title="Top buyer demand"
              subtitle="The most common query demand flowing through the marketplace."
            >
              {data.top_demand.length === 0 ? (
                <p className="text-sm text-gray-500">No demand signals yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.top_demand.map((item, index) => (
                    <div key={`${item.query}-${index}`} className="rounded-2xl bg-gray-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-gray-900">{item.query}</p>
                        <span className="text-sm font-semibold text-gray-700">{item.searches} searches</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Avg. results in market: {Number(item.avg_results || 0).toFixed(1)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section
              title="Missed demand"
              subtitle="Searches with zero results. These are stocking opportunities."
            >
              {data.missed_demand.length === 0 ? (
                <p className="text-sm text-gray-500">No missed demand captured yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.missed_demand.map((item, index) => (
                    <div key={`${item.query}-${index}`} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-gray-900">{item.query || "No keyword"}</p>
                        <span className="text-sm font-semibold text-amber-700">{item.searches} misses</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {item.make_slug || "any make"} • {item.model_slug || "any model"} • {item.year || "any year"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section
              title="Top vehicle demand"
              subtitle="Vehicle combinations buyers search for most."
            >
              {data.top_vehicle_demand.length === 0 ? (
                <p className="text-sm text-gray-500">No vehicle demand data yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.top_vehicle_demand.map((item, index) => (
                    <div key={`${item.make_slug}-${item.model_slug}-${item.year}-${index}`} className="rounded-2xl bg-gray-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-gray-900">
                          {item.make_slug} • {item.model_slug} • {item.year || "year unspecified"}
                        </p>
                        <span className="text-sm font-semibold text-gray-700">{item.searches} searches</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section
              title="Inventory snapshot"
              subtitle="Recent seller listings and compatibility coverage."
            >
              {data.inventory_snapshot.length === 0 ? (
                <p className="text-sm text-gray-500">No inventory found.</p>
              ) : (
                <div className="space-y-3">
                  {data.inventory_snapshot.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-gray-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-gray-900">{item.title}</p>
                        <span className="text-sm font-semibold text-gray-700">{item.status}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        stock: {item.quantity} • price: {item.price} • fitment rows: {item.compatibility_count}
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
