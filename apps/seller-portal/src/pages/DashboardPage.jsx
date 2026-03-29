import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/api/v1/marketplace/dashboard").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const cards = [
    { label: "Active Parts", value: stats?.active_parts ?? "–", icon: "🔩" },
    { label: "Total Orders", value: stats?.total_orders ?? "–", icon: "📦" },
    { label: "Pending Orders", value: stats?.pending_orders ?? "–", icon: "⏳" },
    { label: "Avg Rating", value: stats?.avg_rating ? stats.avg_rating.toFixed(1) : "–", icon: "⭐" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-2xl mb-2">{c.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{c.value}</div>
            <div className="text-sm text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h2 className="font-semibold text-blue-800 mb-1">Quick actions</h2>
        <div className="flex gap-3 mt-3 flex-wrap">
          <a href="/parts/new" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            + Add New Part
          </a>
          <a href="/orders" className="bg-white text-blue-700 border border-blue-300 text-sm px-4 py-2 rounded-lg hover:bg-blue-50 transition">
            View Orders
          </a>
        </div>
      </div>
    </div>
  );
}
