import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";

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

function normalizeOrder(payload) {
  return payload?.data || payload || null;
}

function normalizeItems(order) {
  const items =
    order?.items ||
    order?.order_items ||
    order?.lines ||
    [];

  return Array.isArray(items) ? items : [];
}

export default function OrderDetailsPage() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      try {
        setLoading(true);
        setError("");

        const res = await api.get(`/api/v1/marketplace/me/orders/${id}`);
        if (!active) return;

        setOrder(normalizeOrder(res));
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Failed to load order details");
        setOrder(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrder();

    return () => {
      active = false;
    };
  }, [id]);

  const items = useMemo(() => normalizeItems(order), [order]);

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading order details...
        </div>
      </section>
    );
  }

  if (error || !order) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          {error || "Order not found"}
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
              Order details
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">
              {order.order_number || order.id || "Order"}
            </h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              Review buyer information, line items, payment state, and shipping progress.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/orders"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
            >
              Back to orders
            </Link>
            <Link
              to="/parts"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Inventory
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Order status</p>
          <div className="mt-3">
            <span
              className={[
                "rounded-full px-3 py-1 text-xs font-semibold",
                badgeClasses(order.status),
              ].join(" ")}
            >
              {order.status || "unknown"}
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Payment</p>
          <div className="mt-3">
            <span
              className={[
                "rounded-full px-3 py-1 text-xs font-semibold",
                paymentBadgeClasses(order.payment_status),
              ].join(" ")}
            >
              {order.payment_status || "unknown"}
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Shipping</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {order.shipping_status || "—"}
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {order.total_formatted || order.total || "—"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">Line items</h2>
            <p className="mt-1 text-sm text-gray-500">
              Products included in this order.
            </p>

            {items.length ? (
              <div className="mt-5 space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.id || item.part_id || index}
                    className="rounded-2xl border border-gray-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-gray-900">
                          {item.part_title || item.title || item.name || "Part"}
                        </p>
                        <div className="mt-2 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                          <p>SKU: {item.sku || "—"}</p>
                          <p>Quantity: {item.quantity || "—"}</p>
                          <p>Unit price: {item.unit_price_formatted || item.unit_price || "—"}</p>
                          <p>Line total: {item.total_formatted || item.total || "—"}</p>
                        </div>
                      </div>

                      {item.image_url ? (
                        <div className="h-20 w-20 overflow-hidden rounded-2xl bg-gray-100">
                          <img
                            src={item.image_url}
                            alt={item.part_title || item.title || "Part"}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500">
                No line items available for this order yet.
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">Order notes</h2>
            <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
              {order.notes || order.buyer_notes || "No notes attached to this order."}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Buyer information</h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Buyer name</p>
                <p className="mt-1 font-semibold text-gray-900">{order.buyer_name || "—"}</p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Email</p>
                <p className="mt-1 font-semibold text-gray-900">{order.buyer_email || "—"}</p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Phone</p>
                <p className="mt-1 font-semibold text-gray-900">{order.buyer_phone || "—"}</p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">City</p>
                <p className="mt-1 font-semibold text-gray-900">{order.buyer_city || "—"}</p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-gray-400">Address</p>
                <p className="mt-1 font-semibold text-gray-900">{order.buyer_address || "—"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Status summary</h2>

            <div className="mt-5 space-y-3 text-sm text-gray-600">
              <div className="rounded-2xl bg-gray-50 p-4">
                <span className="font-semibold text-gray-900">Order status:</span> {order.status || "—"}
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <span className="font-semibold text-gray-900">Payment status:</span> {order.payment_status || "—"}
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <span className="font-semibold text-gray-900">Shipping status:</span> {order.shipping_status || "—"}
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <span className="font-semibold text-gray-900">Created at:</span> {order.created_at || "—"}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Quick actions</h2>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                to="/orders"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Back to orders
              </Link>
              <Link
                to="/parts"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Review inventory
              </Link>
              <Link
                to="/store-settings"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-black"
              >
                Store settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
