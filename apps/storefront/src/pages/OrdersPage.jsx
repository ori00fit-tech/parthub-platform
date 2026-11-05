import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { apiGet } from "../lib/api";
import { formatPrice } from "../lib/formatters";
import { dateLocale, statusLabel, useT } from "../i18n";

const STATUS_TONE = {
  pending: "border-amber-400/40 bg-amber-400/10 text-amber-800",
  confirmed: "border-navy/30 bg-navy/[0.06] text-navy",
  processing: "border-navy/30 bg-navy/[0.06] text-navy",
  shipped: "border-violet-400/40 bg-violet-400/10 text-violet-800",
  delivered: "border-emerald-400/40 bg-emerald-400/10 text-emerald-800",
  cancelled: "border-red-400/40 bg-red-400/10 text-red-800",
};

export function formatOrderDate(value) {
  if (!value) return "";
  const date = new Date(`${String(value).replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(dateLocale(), { year: "numeric", month: "short", day: "numeric" });
}

export function OrderStatusBadge({ status }) {
  return (
    <span
      className={[
        "inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold",
        STATUS_TONE[status] || "border-line bg-surface-2 text-ink-2",
      ].join(" ")}
    >
      {statusLabel(status || "pending")}
    </span>
  );
}

// Buyer order history (GET /api/v1/commerce/orders).
export default function OrdersPage() {
  const t = useT();
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState({ loading: true, error: "", orders: [] });

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let active = true;
    apiGet("/api/v1/commerce/orders", undefined, { auth: true })
      .then((res) => active && setState({ loading: false, error: "", orders: Array.isArray(res?.data) ? res.data : [] }))
      .catch((err) => active && setState({ loading: false, error: err?.message || t("Could not load your orders"), orders: [] }));
    return () => {
      active = false;
    };
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-xl rounded-3xl border border-line bg-surface p-8 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-ink">{t("Sign in to view your orders")}</h1>
        <p className="mt-2 text-sm text-muted">{t("Your orders and their status are saved in your account.")}</p>
        <Link to="/auth?redirect=/orders" className="btn-cta mt-6 h-11 rounded-xl px-6 text-sm">
          {t("Sign in")}
        </Link>
      </section>
    );
  }

  const { loading, error, orders } = state;

  return (
    <section className="space-y-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">{t("My Orders")}</h1>
          <p className="mt-1 text-sm text-muted">{t("Follow the status of each order.")}</p>
        </div>
        <Link to="/parts" className="text-sm font-semibold text-link hover:underline">
          {t("Continue browsing")}
        </Link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-line bg-surface" />
          ))}
        </div>
      ) : !error && orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line-strong bg-surface p-8 text-center">
          <p className="text-lg font-semibold text-ink">{t("No orders yet")}</p>
          <p className="mt-1 text-sm text-muted">{t("When you place an order, it appears here with its status.")}</p>
          <Link to="/parts" className="btn-cta mt-5 h-11 rounded-xl px-6 text-sm">
            {t("Browse parts")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-ink">{order.reference || `#${order.id}`}</p>
                  <p className="mt-0.5 text-xs text-muted">{formatOrderDate(order.created_at)}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                <p className="text-sm text-muted">
                  {t("Total")}: <span className="font-mono font-semibold text-ink">{formatPrice(order.total)}</span>
                </p>
                {order.reference ? (
                  <Link
                    to={`/orders/${encodeURIComponent(order.reference)}/tracking`}
                    className="inline-flex h-9 items-center rounded-xl border border-line-strong px-4 text-sm font-semibold text-ink-2 transition hover:bg-surface-3"
                  >
                    {t("Order details")}
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
