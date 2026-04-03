import { useEffect, useState } from "react";
import { api } from "../lib/api";

function normalizeRows(payload) {
  return Array.isArray(payload?.data) ? payload.data : [];
}

export default function OrdersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRows() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/v1/admin/orders");
      setRows(normalizeRows(res));
    } catch (err) {
      setError(err?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, []);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-700 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">Orders overview</h1>
        <p className="mt-3 text-sm text-emerald-100 sm:text-base">
          Inspect order pipeline health and monitor marketplace fulfillment status.
        </p>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading orders...</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No orders available yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.map((order) => (
              <div key={order.id} className="p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Order #{order.id}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      buyer: {order.buyer_name || "unknown"} • {order.buyer_email || "no email"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                      status: {order.status}
                    </span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                      payment: {order.payment_status}
                    </span>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                      shipping: {order.shipping_status}
                    </span>
                    <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">
                      total: {order.total}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
