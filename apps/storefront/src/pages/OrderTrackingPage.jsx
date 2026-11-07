import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { apiGet } from "../lib/api";
import { formatPrice } from "../lib/formatters";
import { mediaUrl } from "../lib/media";
import { statusLabel, useT } from "../i18n";
import { OrderStatusBadge, formatOrderDate } from "./OrdersPage";
import { Icon } from "@parthub/shared/icons";
import { ItemReview } from "../features/reviews/Reviews";
import ItemIssue from "../features/issues/ItemIssue";

// Order lifecycle as stored on the order (orders.status).
const STEPS = [
  { key: "pending", label: "Order received", text: "The seller has your order and will confirm it." },
  { key: "confirmed", label: "Confirmed", text: "The seller confirmed availability and fitment." },
  { key: "shipped", label: "Shipped", text: "Your parts are on the way." },
  { key: "delivered", label: "Delivered", text: "The order was delivered." },
];
const STEP_INDEX = { pending: 0, confirmed: 1, processing: 1, shipped: 2, delivered: 3 };
// Every part collected at the store (pickup or courier): no shipping step.
const PICKUP_STEPS = [
  { key: "pending", label: "Order received", text: "The seller has your order and will confirm it." },
  { key: "confirmed", label: "Reserved for you", text: "The part is kept for you at the store." },
  { key: "delivered", label: "Collected", text: "You collected the parts." },
];
const PICKUP_STEP_INDEX = { pending: 0, confirmed: 1, processing: 1, shipped: 1, delivered: 2 };
const isPickup = (item) => item.fulfillment === "pickup" || item.fulfillment === "courier";

function formatUntil(value) {
  if (!value) return "";
  const d = new Date(`${String(value).replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

// Where and how to collect one seller's parts, with the code to give there.
function PickupCard({ pickup, lines, t }) {
  const line = lines[0] || {};
  const open = lines.some((l) => l.status !== "delivered" && l.status !== "cancelled");
  const collected = lines.every((l) => l.status === "delivered" || l.status === "cancelled") && lines.some((l) => l.status === "delivered");
  const wa = String(pickup.whatsapp || "").replace(/\D/g, "");
  return (
    <div className="rounded-3xl border border-sky-400/40 bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-link">
            {line.fulfillment === "courier" ? t("Collected by someone you send") : t("Pickup at the store")}
          </p>
          <h2 className="mt-1 text-xl font-bold text-ink">{pickup.name}</h2>
          <p className="mt-1 text-sm text-ink-2">{[pickup.pickup_address, pickup.location].filter(Boolean).join(", ")}</p>
          {pickup.pickup_hours ? <p className="text-sm text-muted">{t("Opening hours: {hours}", { hours: pickup.pickup_hours })}</p> : null}
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {pickup.phone ? <a href={`tel:${pickup.phone}`} dir="ltr" className="font-semibold text-link hover:underline">{pickup.phone}</a> : null}
            {wa ? <a href={`https://wa.me/${wa.startsWith("0") ? `212${wa.slice(1)}` : wa}`} className="font-semibold text-link hover:underline">WhatsApp</a> : null}
          </div>
        </div>
        {open && line.pickup_code ? (
          <div className="rounded-2xl border border-line bg-surface-2 px-5 py-3 text-center">
            <p className="text-xs font-semibold text-muted">{t("Pickup code")}</p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-[0.2em] text-ink" dir="ltr">{line.pickup_code}</p>
          </div>
        ) : null}
      </div>
      {collected ? (
        <p className="mt-4 text-sm font-semibold text-emerald-800">{t("Collected. Thank you!")}</p>
      ) : open ? (
        <ul className="mt-4 space-y-1.5 text-sm text-ink-2">
          {line.status === "pending" ? <li>• {t("Wait until the seller confirms: the part is then kept for you.")}</li> : null}
          {line.pickup_until ? <li>• {t("Kept for you until {date}.", { date: formatUntil(line.pickup_until) })}</li> : null}
          <li>• {t("Check the part at the store (number, condition, fit). If it isn't right, you can refuse it and pay nothing.")}</li>
          <li>• {t("Pay the seller in cash, then give the code: it closes the order. Never give it before you have the part.")}</li>
          {line.fulfillment === "courier" ? (
            <li>• {t("Send the code to the person who collects it{name}.", { name: line.collector_name ? ` (${line.collector_name})` : "" })}</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

// Real order details and status for the signed-in buyer
// (GET /api/v1/commerce/orders/:reference).
export default function OrderTrackingPage() {
  const t = useT();
  const { orderNumber } = useParams();
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState({ loading: true, error: "", order: null });

  const load = useCallback(
    () =>
      apiGet(`/api/v1/commerce/orders/${encodeURIComponent(orderNumber)}`, undefined, { auth: true })
        .then((res) => setState({ loading: false, error: "", order: res?.data || null }))
        .catch((err) => setState({ loading: false, error: err?.message || t("Could not load this order"), order: null })),
    [orderNumber] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!isAuthenticated || !orderNumber) return;
    load();
  }, [isAuthenticated, orderNumber, load]);

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-xl rounded-3xl border border-line bg-surface p-8 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-ink">{t("Sign in to see this order")}</h1>
        <p className="mt-2 text-sm text-muted">{t("Orders are linked to the account that placed them.")}</p>
        <Link
          to={`/auth?redirect=${encodeURIComponent(`/orders/${orderNumber || ""}/tracking`)}`}
          className="btn-cta mt-6 h-11 rounded-xl px-6 text-sm"
        >
          {t("Sign in")}
        </Link>
      </section>
    );
  }

  const { loading, error, order } = state;
  const back = (
    <Link to="/orders" className="text-sm font-semibold text-link hover:underline">
      <span aria-hidden="true" className="inline-block rtl:rotate-180">←</span> {t("My Orders")}
    </Link>
  );

  if (loading) {
    return (
      <section className="space-y-4" aria-busy="true">
        {back}
        <div className="h-40 animate-pulse rounded-3xl border border-line bg-surface" />
        <div className="h-64 animate-pulse rounded-3xl border border-line bg-surface" />
      </section>
    );
  }

  if (error || !order) {
    return (
      <section className="space-y-4">
        {back}
        <div className="rounded-3xl border border-line bg-surface p-8 text-center">
          <p className="text-lg font-semibold text-ink">{t("Order not found")}</p>
          <p className="mt-1 text-sm text-muted">{error || t("Check the order number in your account.")}</p>
        </div>
      </section>
    );
  }

  const cancelled = order.status === "cancelled";
  const items = Array.isArray(order.items) ? order.items : [];
  const pickupOnly = items.length > 0 && items.every(isPickup);
  const steps = pickupOnly ? PICKUP_STEPS : STEPS;
  const current = (pickupOnly ? PICKUP_STEP_INDEX : STEP_INDEX)[order.status] ?? 0;
  const pickups = Array.isArray(order.pickups) ? order.pickups : [];
  const delivered = items.some((i) => !isPickup(i));
  const events = Array.isArray(order.events) ? order.events : [];
  // Messages left with a status change (e.g. why a seller cancelled).
  const notes = events.filter((e) => e.note && e.actor !== "buyer" && !String(e.event).startsWith("issue_"));
  const cancelNote = [...events].reverse().find((e) => e.event === "cancelled" && e.note)?.note || "";
  const address = order.shipping_address;

  return (
    <section className="space-y-6 pb-10">
      {back}

      <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t("Order")}</p>
            <h1 className="mt-1 font-mono text-2xl font-bold text-ink">{order.reference}</h1>
            <p className="mt-1 text-sm text-muted">{t("Placed on {date}", { date: formatOrderDate(order.created_at) })}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        {cancelled ? (
          <p className="mt-5 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-800">
            {t("This order was cancelled.")}
            {cancelNote ? <span className="mt-1 block">{t("Reason: {note}", { note: cancelNote })}</span> : null}
          </p>
        ) : (
          <ol className={["mt-6 grid gap-3", pickupOnly ? "sm:grid-cols-3" : "sm:grid-cols-4"].join(" ")}>
            {steps.map((step, i) => {
              const done = i <= current;
              return (
                <li
                  key={step.key}
                  aria-current={i === current ? "step" : undefined}
                  className={[
                    "rounded-2xl border p-4",
                    done ? "border-emerald-400/40 bg-emerald-400/10" : "border-line bg-surface-2",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold",
                        done ? "bg-emerald-600 text-white" : "bg-line-strong text-white",
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      {done ? <Icon name="ok" className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                    </span>
                    <p className={["text-sm font-semibold", done ? "text-emerald-900" : "text-muted"].join(" ")}>{t(step.label)}</p>
                  </div>
                  <p className="mt-2 text-xs text-muted">{t(step.text)}</p>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {!cancelled
        ? pickups.map((p) => (
            <PickupCard key={p.seller_id} pickup={p} lines={items.filter((i) => isPickup(i) && Number(i.seller_id) === Number(p.seller_id))} t={t} />
          ))
        : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-lg font-bold text-ink">{t("Items")}</h2>
          <ul className="mt-3 divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="py-3">
                <div className="flex items-center gap-3">
                  <div className="media-well flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-lg">
                    {item.thumbnail ? (
                      <img src={mediaUrl(item.thumbnail)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Icon name="part" className="h-6 w-6 text-faint" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-ink">{item.title}</p>
                    <p className="text-xs text-muted">
                      {t("{price} each", { price: formatPrice(item.price) })} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className={["font-mono text-sm font-semibold", item.status === "cancelled" ? "text-faint line-through" : "text-ink"].join(" ")}>
                      {formatPrice(item.subtotal)}
                    </p>
                    {item.status && item.status !== order.status ? (
                      <div className="mt-1">
                        <OrderStatusBadge status={item.status} />
                      </div>
                    ) : null}
                  </div>
                </div>
                {(item.status || order.status) === "delivered" && item.part_id ? <ItemReview item={item} /> : null}
                {item.issue || item.can_report ? <ItemIssue reference={order.reference} item={item} onChange={load} /> : null}
              </li>
            ))}
          </ul>
          {notes.length && !cancelled ? (
            <div className="mt-3 space-y-2 border-t border-line pt-3">
              <h3 className="text-sm font-semibold text-ink">{t("Messages from the seller")}</h3>
              {notes.map((e, i) => (
                <p key={i} className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-2">
                  <span className="font-semibold">{statusLabel(e.event)}:</span> {e.note}
                </p>
              ))}
            </div>
          ) : null}
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1.5 border-t border-line pt-3 text-sm">
            <dt className="text-muted">{t("Subtotal")}</dt>
            <dd className="text-end font-mono">{formatPrice(order.subtotal)}</dd>
            <dt className="text-muted">{delivered ? t("Shipping") : t("Pickup at the store")}</dt>
            <dd className="text-end font-mono">{formatPrice(order.shipping_fee)}</dd>
            <dt className="font-semibold text-ink">{t("Total")}</dt>
            <dd className="text-end font-mono font-semibold text-ink">{formatPrice(order.total)}</dd>
          </dl>
        </div>

        <aside className="space-y-4">
          {address && delivered && address.address_line1 ? (
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
              <h2 className="text-lg font-bold text-ink">{t("Delivery details")}</h2>
              <div className="mt-2 space-y-0.5 text-sm text-ink-2">
                <p className="font-semibold">{address.full_name}</p>
                <p>{address.address_line1}</p>
                {address.address_line2 ? <p>{address.address_line2}</p> : null}
                <p>{[address.postal_code, address.city].filter(Boolean).join(" ")}</p>
                <p dir="ltr" className="text-start">{address.phone}</p>
              </div>
            </div>
          ) : null}
          <div className="rounded-3xl border border-line bg-surface p-5 text-sm text-muted shadow-sm">
            <p className="font-semibold text-ink">{t("Payment")}</p>
            <p className="mt-1 font-semibold text-ink">{pickupOnly ? t("Cash at the store") : t("Cash on delivery")}</p>
            {order.payment_status === "paid" ? (
              <p className="mt-1">{t("Payment status: {status}", { status: statusLabel("paid") })}</p>
            ) : cancelled || order.status === "delivered" ? null : (
              <p className="mt-1">
                {pickupOnly
                  ? t("To pay the seller at pickup: {amount}", { amount: formatPrice(order.total) })
                  : t("To pay the seller on delivery: {amount}", { amount: formatPrice(order.total) })}
              </p>
            )}
            <p className="mt-3">{t("The seller may call you to confirm the part before shipping.")}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
