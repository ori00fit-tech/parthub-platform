import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const STATUS_OPTIONS = [
  "all",
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

function normalizeOrders(payload) {
  const list =
    payload?.data?.items ||
    payload?.data?.orders ||
    payload?.data ||
    payload?.items ||
    payload?.orders ||
    [];

  return Array.isArray(list) ? list : [];
}

function statusBadge(status) {
  switch (String(status || "").toLowerCase()) {
    case "pending":
      return "bg-yellow-900/30 text-yellow-300 border-yellow-800/60";
    case "confirmed":
    case "processing":
      return "bg-blue-900/30 text-blue-300 border-blue-800/60";
    case "shipped":
      return "bg-purple-900/30 text-purple-300 border-purple-800/60";
    case "delivered":
      return "bg-green-900/30 text-green-300 border-green-800/60";
    case "cancelled":
      return "bg-red-900/30 text-red-300 border-red-800/60";
    default:
      return "bg-gray-800 text-gray-300 border-gray-700";
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/v1/admin/orders");
      setOrders(normalizeOrders(res));
    } catch (err) {
      setOrders([]);
      setError(err?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();

    return orders.filter((order) => {
      const haystack = [
        order.id,
        order.order_number,
        order.buyer_name,
        order.buyer_email,
        order.status,
        order.payment_status,
        order.shipping_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !q || haystack.includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        String(order.status || "").toLowerCase() === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [orders, query, statusFilter]);

  const counts = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o) => String(o.status || "").toLowerCase() === "pending").length,
      shipped: orders.filter((o) => String(o.status || "").toLowerCase() === "shipped").length,
      delivered: orders.filter((o) => String(o.status || "").toLowerCase() === "delivered").length,
    };
  }, [orders]);

  async function updateStatus(id, nextStatus) {
    try {
      setWorkingId(id);
      setError("");

      await api.patch(`/api/v1/admin/orders/${id}/status`, {
        status: nextStatus,
      });

      setOrders((prev) =>
        prev.map((order) =>
          String(order.id) === String(id)
            ? { ...order, status: nextStatus }
            : order
        )
      );
    } catch (err) {
      setError(err?.message || "Failed to update order status");
    } finally {
      setWorkingId(null);
    }
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
  }

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 text-sm text-gray-400 shadow-sm">
          Loading orders...
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-gray-800 bg-gradient-to-br from-gray-900 via-slate-950 to-blue-950 p-6 text-white shadow-xl sm:p-8">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
            Orders oversight
          </div>
          <h1 className="text-3xl font-bold sm:text-5xl">All marketplace orders</h1>
          <p className="mt-3 text-sm text-gray-300 sm:text-base">
            Review order flow across the marketplace and update statuses when needed.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-900/50 bg-red-950/20 p-6 text-red-300 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total orders</p>
          <p className="mt-2 text-3xl font-bold text-gray-100">{counts.total}</p>
        </div>

        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="mt-2 text-3xl font-bold text-gray-100">{counts.pending}</p>
        </div>

        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Shipped</p>
          <p className="mt-2 text-3xl font-bold text-gray-100">{counts.shipped}</p>
        </div>

        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Delivered</p>
          <p className="mt-2 text-3xl font-bold text-gray-100">{counts.delivered}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr_auto]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search order id, buyer, email, status..."
            className="h-12 rounded-2xl border border-gray-700 bg-gray-950 px-4 text-sm text-gray-100 outline-none focus:border-blue-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-12 rounded-2xl border border-gray-700 bg-gray-950 px-4 text-sm text-gray-100 outline-none"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="h-12 rounded-2xl border border-gray-700 bg-gray-950 px-4 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
          >
            Reset
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-400">
          <span className="font-semibold text-gray-100">{filteredOrders.length}</span> orders found
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-700 bg-gray-900 p-10 text-center shadow-sm">
          <div className="text-5xl mb-4">📦</div>
          <h2 className="text-2xl font-bold text-gray-100">No orders found</h2>
          <p className="mt-2 text-sm text-gray-400">
            No orders match the current filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <article
              key={order.id}
              className="rounded-3xl border border-gray-800 bg-gray-900 p-5 shadow-sm transition hover:border-blue-800"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-100">
                      {order.order_number || order.id || "Order"}
                    </h3>

                    <span
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-semibold",
                        statusBadge(order.status),
                      ].join(" ")}
                    >
                      {order.status || "unknown"}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-gray-400 sm:grid-cols-2 xl:grid-cols-3">
                    <p>Buyer: {order.buyer_name || "—"}</p>
                    <p>Email: {order.buyer_email || "—"}</p>
                    <p>Payment: {order.payment_status || "—"}</p>
                    <p>Shipping: {order.shipping_status || "—"}</p>
                    <p>Total: {order.total ?? "—"}</p>
                    <p>Created: {order.created_at || "—"}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 xl:min-w-[190px]">
                  <button
                    onClick={() => updateStatus(order.id, "confirmed")}
                    disabled={workingId === order.id}
                    className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
                  >
                    {workingId === order.id ? "Updating..." : "Confirm"}
                  </button>

                  <button
                    onClick={() => updateStatus(order.id, "shipped")}
                    disabled={workingId === order.id}
                    className="rounded-2xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-60"
                  >
                    {workingId === order.id ? "Updating..." : "Mark shipped"}
                  </button>

                  <button
                    onClick={() => updateStatus(order.id, "delivered")}
                    disabled={workingId === order.id}
                    className="rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500 disabled:opacity-60"
                  >
                    {workingId === order.id ? "Updating..." : "Mark delivered"}
                  </button>

                  <button
                    onClick={() => updateStatus(order.id, "cancelled")}
                    disabled={workingId === order.id}
                    className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
                  >
                    {workingId === order.id ? "Updating..." : "Cancel"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
