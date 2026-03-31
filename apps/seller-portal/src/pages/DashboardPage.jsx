import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

function statCards(stats) {
  return [
    { label: "Active Parts", value: stats?.active_parts ?? "–", icon: "🔩" },
    { label: "Total Orders", value: stats?.total_orders ?? "–", icon: "📦" },
    { label: "Pending Orders", value: stats?.pending_orders ?? "–", icon: "⏳" },
    {
      label: "Avg Rating",
      value:
        typeof stats?.avg_rating === "number"
          ? stats.avg_rating.toFixed(1)
          : "–",
      icon: "⭐",
    },
  ];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        const res = await api.get("/api/v1/marketplace/dashboard");
        if (!active) return;
        setStats(res?.data || null);
      } catch {
        if (!active) return;
        setStats(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(() => statCards(stats), [stats]);

  const lowStockCount =
    typeof stats?.low_stock_parts === "number"
      ? stats.low_stock_parts
      : typeof stats?.low_stock_count === "number"
        ? stats.low_stock_count
        : "–";

  const recentOrders =
    Array.isArray(stats?.recent_orders) ? stats.recent_orders.slice(0, 5) : [];

  const storeStatus =
    stats?.store_status ||
    (stats?.store_ready ? "ready" : "incomplete");

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              Seller dashboard
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">
              Welcome back{user?.name ? `, ${user.name}` : ""}
            </h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              Review store activity, inventory health, orders, and quick actions from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/parts/create"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
            >
              + Add new part
            </Link>
            <Link
              to="/orders"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              View orders
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="text-2xl">{card.icon}</div>
            <div className="mt-3 text-3xl font-bold text-gray-900">{card.value}</div>
            <div className="mt-1 text-sm text-gray-500">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Quick actions</h2>
                <p className="text-sm text-gray-500">
                  Jump directly into the most common seller workflows.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                to="/parts/create"
                className="rounded-2xl bg-blue-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                + Create new part
              </Link>

              <Link
                to="/media-upload"
                className="rounded-2xl border border-gray-300 bg-white px-5 py-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Upload media
              </Link>

              <Link
                to="/parts"
                className="rounded-2xl border border-gray-300 bg-white px-5 py-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Manage inventory
              </Link>

              <Link
                to="/store-settings"
                className="rounded-2xl border border-gray-300 bg-white px-5 py-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Store settings
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">Recent orders</h2>
            <p className="mt-1 text-sm text-gray-500">
              Quick preview of the newest seller-side order activity.
            </p>

            {loading ? (
              <div className="mt-5 rounded-2xl bg-gray-50 px-4 py-6 text-sm text-gray-500">
                Loading dashboard activity...
              </div>
            ) : recentOrders.length ? (
              <div className="mt-5 space-y-3">
                {recentOrders.map((order) => (
                  <Link
                    key={order.id || order.order_number}
                    to={`/orders/${order.id || order.order_number}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">
                        {order.order_number || order.id || "Order"}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {order.buyer_name || "Buyer"} • {order.status || "pending"}
                      </p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      {order.total_formatted || order.total || "—"}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500">
                No recent orders yet. New seller orders can appear here once order activity grows.
              </div>
            )}

            <div className="mt-5">
              <Link
                to="/orders"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                View all orders →
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Store readiness</h2>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Store status</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{storeStatus}</p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Low stock parts</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{lowStockCount}</p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Seller email</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {user?.email || "Not available"}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <Link
                to="/store-settings"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Open store settings
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Suggested next steps</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="rounded-2xl bg-gray-50 p-4">
                Add more parts to increase storefront coverage.
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                Upload better product images to improve listing quality.
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                Complete store settings to strengthen seller presence.
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Portal scope</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Inventory</p>
                <p className="mt-1 font-semibold text-gray-900">Ready to expand</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Orders</p>
                <p className="mt-1 font-semibold text-gray-900">Foundation active</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
