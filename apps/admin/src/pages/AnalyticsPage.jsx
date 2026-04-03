import { useEffect, useState } from "react";
import { api } from "../lib/api";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
      <div className="mt-5">{children}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState({
    top_queries: [],
    zero_result_queries: [],
    top_vehicle_searches: [],
    recent_searches: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("/api/v1/admin/analytics/search-demand");
        if (!active) return;

        setData({
          top_queries: safeArray(res?.data?.top_queries),
          zero_result_queries: safeArray(res?.data?.zero_result_queries),
          top_vehicle_searches: safeArray(res?.data?.top_vehicle_searches),
          recent_searches: safeArray(res?.data?.recent_searches),
        });
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load analytics");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAnalytics();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-700 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">Search demand analytics</h1>
        <p className="mt-3 text-sm text-cyan-100 sm:text-base">
          Understand what buyers search for, what they fail to find, and which vehicle demand is strongest.
        </p>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-56 animate-pulse rounded-3xl border border-gray-200 bg-white shadow-sm"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard
            title="Top buyer queries"
            subtitle="The most common search keywords currently used across the marketplace."
          >
            {data.top_queries.length === 0 ? (
              <p className="text-sm text-gray-500">No query analytics available yet.</p>
            ) : (
              <div className="space-y-3">
                {data.top_queries.map((item, index) => (
                  <div key={`${item.query}-${index}`} className="rounded-2xl bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-gray-900">{item.query}</p>
                      <span className="text-sm font-semibold text-gray-700">{item.searches} searches</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Avg. results: {Number(item.avg_results || 0).toFixed(1)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Zero-result demand"
            subtitle="Queries that buyers search for but fail to find. This is direct supply opportunity."
          >
            {data.zero_result_queries.length === 0 ? (
              <p className="text-sm text-gray-500">No zero-result searches found yet.</p>
            ) : (
              <div className="space-y-3">
                {data.zero_result_queries.map((item, index) => (
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
          </SectionCard>

          <SectionCard
            title="Top vehicle demand"
            subtitle="Most searched make/model/year combinations."
          >
            {data.top_vehicle_searches.length === 0 ? (
              <p className="text-sm text-gray-500">No vehicle search analytics yet.</p>
            ) : (
              <div className="space-y-3">
                {data.top_vehicle_searches.map((item, index) => (
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
          </SectionCard>

          <SectionCard
            title="Recent search activity"
            subtitle="Latest buyer search events flowing through the system."
          >
            {data.recent_searches.length === 0 ? (
              <p className="text-sm text-gray-500">No recent search events yet.</p>
            ) : (
              <div className="space-y-3">
                {data.recent_searches.map((item, index) => (
                  <div key={`${item.created_at}-${index}`} className="rounded-2xl bg-gray-50 p-4">
                    <p className="font-semibold text-gray-900">{item.query || "No keyword"}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {item.make_slug || "any make"} • {item.model_slug || "any model"} • {item.year || "any year"}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      results: {item.results_count ?? 0} • {item.created_at || "unknown time"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </section>
  );
}
