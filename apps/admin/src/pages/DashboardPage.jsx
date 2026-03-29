import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/v1/admin/dashboard")
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Total Sellers", value: stats?.total_sellers, icon: "🏪", to: "/sellers" },
    { label: "Active Parts", value: stats?.total_parts, icon: "🔩", to: "/parts" },
    { label: "Total Orders", value: stats?.total_orders, icon: "📦", to: "/orders" },
    { label: "Revenue (paid)", value: stats?.total_revenue != null ? `$${(stats.total_revenue / 100).toFixed(0)}` : "–", icon: "💰", to: "/orders" },
  ];

  const alerts = [
    { label: "Sellers pending approval", value: stats?.pending_sellers, to: "/sellers?status=pending", color: "yellow" },
    { label: "Parts pending review", value: stats?.pending_parts, to: "/parts?status=pending", color: "blue" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-8">Dashboard</h1>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {cards.map((c) => (
              <Link key={c.label} to={c.to} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-blue-800 transition">
                <div className="text-2xl mb-3">{c.icon}</div>
                <div className="text-2xl font-bold text-gray-100">{c.value ?? "–"}</div>
                <div className="text-xs text-gray-500 mt-1">{c.label}</div>
              </Link>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {alerts.map((a) => (
              <Link key={a.label} to={a.to} className={`flex items-center justify-between p-4 rounded-xl border ${
                a.color === "yellow"
                  ? "bg-yellow-900/20 border-yellow-800/50 hover:border-yellow-600"
                  : "bg-blue-900/20 border-blue-800/50 hover:border-blue-600"
              } transition`}>
                <span className="text-sm text-gray-300">{a.label}</span>
                <span className={`text-2xl font-bold ${a.color === "yellow" ? "text-yellow-400" : "text-blue-400"}`}>
                  {a.value ?? 0}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
