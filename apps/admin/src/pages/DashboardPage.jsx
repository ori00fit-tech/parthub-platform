import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/api/v1/admin/dashboard");
        if (!active) return;
        setStats(res?.data || null);
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load dashboard");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const cards = [
    { label: "Total Sellers", value: stats?.total_sellers, icon: "🏪", to: "/sellers" },
    { label: "Active Parts", value: stats?.total_parts, icon: "🔩", to: "/parts" },
    { label: "Total Orders", value: stats?.total_orders, icon: "📦", to: "/orders" },
    {
      label: "Revenue (paid)",
      value: stats?.total_revenue != null ? `$${(stats.total_revenue / 100).toFixed(0)}` : "–",
      icon: "💰",
      to: "/orders",
    },
  ];

  const alerts = [
    { label: "Sellers pending approval", value: stats?.pending_sellers, to: "/sellers?status=pending", color: "yellow" },
    { label: "Parts pending review", value: stats?.pending_parts, to: "/parts?status=pending", color: "blue" },
  ];

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-gray-800 bg-gradient-to-br from-gray-900 via-slate-950 to-blue-950 p-6 text-white shadow-xl sm:p-8">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
            Admin dashboard
          </div>
          <h1 className="text-3xl font-bold sm:text-5xl">Platform control center</h1>
          <p className="mt-3 text-sm text-gray-300 sm:text-base">
            Monitor marketplace health, moderation queues, and operational activity from one place.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-900/50 bg-red-950/20 p-6 text-red-300 shadow-sm">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-3xl border border-gray-800 bg-gray-900 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {cards.map((card) => (
              <Link
                key={card.label}
                to={card.to}
                className="rounded-3xl border border-gray-800 bg-gray-900 p-5 shadow-sm transition hover:border-blue-800"
              >
                <div className="text-2xl mb-3">{card.icon}</div>
                <div className="text-3xl font-bold text-gray-100">{card.value ?? "–"}</div>
                <div className="mt-1 text-xs text-gray-500">{card.label}</div>
              </Link>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {alerts.map((alert) => (
              <Link
                key={alert.label}
                to={alert.to}
                className={`flex items-center justify-between rounded-3xl border p-5 transition ${
                  alert.color === "yellow"
                    ? "border-yellow-800/50 bg-yellow-900/20 hover:border-yellow-600"
                    : "border-blue-800/50 bg-blue-900/20 hover:border-blue-600"
                }`}
              >
                <span className="text-sm text-gray-300">{alert.label}</span>
                <span
                  className={`text-3xl font-bold ${
                    alert.color === "yellow" ? "text-yellow-300" : "text-blue-300"
                  }`}
                >
                  {alert.value ?? 0}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
