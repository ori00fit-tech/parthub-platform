import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

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

function badgeClasses(status) {
  switch (String(status || "").toLowerCase()) {
    case "pending":
      return "bg-amber-50 text-amber-700";
    case "confirmed":
    case "processing":
      return "bg-blue-50 text-blue-700";
    case "shipped":
      return "bg-purple-50 text-purple-700";
    case "delivered":
      return "bg-green-50 text-green-700";
    case "cancelled":
      return "bg-red-50 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function paymentBadgeClasses(status) {
  switch (String(status || "").toLowerCase()) {
    case "paid":
      return "bg-green-50 text-green-700";
    case "pending":
      return "bg-amber-50 text-amber-700";
    case "failed":
      return "bg-red-50 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/api/v1/marketplace/me/orders");
        if (!active) return;
        setOrders(normalizeOrders(res));
      } catch (err) {
        if (!active) return;
        setOrders([]);
        setError(err?.message || "Failed to load seller orders");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();

    return orders.filter((order) => {
      const haystack = [
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
        !statusFilter || String(order.status || "").toLowerCase() === statusFilter;

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

  function clearFilters() {
    setQuery("");
    setStatusFilter("");
  }

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading seller orders...
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              Orders management
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">Seller orders</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              Review incoming orders, monitor statuses, and move into order details.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/parts"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
            >
              Inventory
            </Link>
            <Link
              to="/store-settings"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Store settings
            </Link>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total orders</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{counts.total}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{counts.pending}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Shipped</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{counts.shipped}</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Delivered</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{counts.delivered}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr_auto]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search order id, buyer, status..."
            className="h-12 rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-12 rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            type="button"
            onClick={clearFilters}
            className="h-12 rounded-2xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Reset
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{filteredOrders.length}</span> orders found
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <div className="text-5xl">📦</div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">No orders yet</h2>
          <p className="mt-2 text-sm text-gray-500">
            New seller orders will appear here when buyer activity starts.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <article
              key={order.id || order.order_number}
              className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {order.order_number || order.id || "Order"}
                    </h3>

                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        badgeClasses(order.status),
                      ].join(" ")}
                    >
                      {order.status || "unknown"}
                    </span>

                    {order.payment_status ? (
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          paymentBadgeClasses(order.payment_status),
                        ].join(" ")}
                      >
                        Payment: {order.payment_status}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2 xl:grid-cols-3">
                    <p>Buyer: {order.buyer_name || "—"}</p>
                    <p>Email: {order.buyer_email || "—"}</p>
                    <p>Shipping: {order.shipping_status || "—"}</p>
                    <p>Created: {order.created_at || "—"}</p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 xl:items-end">
                  <div className="rounded-2xl bg-gray-50 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Total</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">
                      {order.total || "—"}
                    </p>
                  </div>

                  <Link
                    to={`/orders/${order.id}`}
                    className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    View order
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
