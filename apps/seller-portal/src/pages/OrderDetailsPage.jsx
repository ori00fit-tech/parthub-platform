import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatMoney } from "@parthub/shared";
import { Icon } from "@parthub/shared/icons";
import { api } from "../lib/api";
import { mediaUrl } from "../lib/requests";
import { dateLocale, statusLabel, useT } from "../i18n";

export function badgeClasses(status) {
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

// "2026-11-05 10:20:00" (UTC, from D1) → local date and time.
export function formatOrderDate(value, withTime = false) {
  const d = new Date(`${String(value || "").replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(dateLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

// 0612345678 / +212 6 12 34 56 78 → 212612345678 (wa.me link).
function whatsappNumber(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("212")) return digits;
  if (digits.startsWith("0")) return `212${digits.slice(1)}`;
  return digits;
}

// Labels and help for each next step a seller can take.
const ACTIONS = {
  confirmed: { label: "Confirm order", hint: "You have the parts and checked fitment with the buyer if needed.", tone: "primary" },
  shipped: { label: "Mark as shipped", hint: "The parts left your store with the delivery company or your driver.", tone: "primary" },
  delivered: { label: "Mark as delivered", hint: "The buyer received the parts. The 7-day returns window starts now.", tone: "primary" },
  cancelled: { label: "Cancel order", hint: "The quantities go back to your stock.", tone: "danger" },
};

function Badge({ status }) {
  return (
    <span className={["inline-flex rounded-full px-3 py-1 text-xs font-semibold", badgeClasses(status)].join(" ")}>
      {statusLabel(status || "pending")}
    </span>
  );
}

function actorLabel(t, createdBy) {
  const by = String(createdBy || "");
  if (by.startsWith("seller")) return t("Seller");
  if (by === "admin") return "PartHub";
  if (by === "buyer") return t("Buyer");
  return "PartHub";
}

export default function OrderDetailsPage() {
  const t = useT();
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [actionError, setActionError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get(`/api/v1/marketplace/me/orders/${id}`)
      .then((res) => active && (setOrder(res?.data || null), setError("")))
      .catch((err) => active && (setOrder(null), setError(err?.message || t("Failed to load order details"))))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function move(status) {
    setActionError("");
    if (status === "cancelled" && !cancelNote.trim()) {
      setActionError(t("Tell the buyer why the order is cancelled"));
      return;
    }
    setSaving(status);
    try {
      const res = await api.patch(`/api/v1/marketplace/me/orders/${id}/status`, {
        status,
        ...(status === "cancelled" ? { note: cancelNote.trim() } : {}),
      });
      setOrder(res?.data || order);
      setCancelOpen(false);
      setCancelNote("");
    } catch (err) {
      setActionError(err?.message || t("Something went wrong. Please try again."));
    } finally {
      setSaving("");
    }
  }

  if (loading) {
    return (
      <section className="space-y-4" aria-busy="true">
        <div className="h-32 animate-pulse rounded-3xl bg-white" />
        <div className="h-64 animate-pulse rounded-3xl bg-white" />
      </section>
    );
  }

  if (error || !order) {
    return (
      <section className="space-y-4">
        <Link to="/orders" className="text-sm font-semibold text-blue-700 hover:underline">
          <span aria-hidden="true" className="inline-block rtl:rotate-180">←</span> {t("Back to orders")}
        </Link>
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">{error || t("Order not found")}</div>
      </section>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const events = Array.isArray(order.events) ? order.events : [];
  const next = (order.next_statuses || []).filter((s) => ACTIONS[s]);
  const forward = next.filter((s) => s !== "cancelled");
  const canCancel = next.includes("cancelled");
  const wa = whatsappNumber(order.buyer_phone);
  const address = [order.address_line1, order.address_line2, order.buyer_city, order.postal_code].filter(Boolean).join(", ");

  return (
    <section className="space-y-6">
      <Link to="/orders" className="text-sm font-semibold text-blue-700 hover:underline">
        <span aria-hidden="true" className="inline-block rtl:rotate-180">←</span> {t("Back to orders")}
      </Link>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">{t("Order")}</p>
            <h1 className="font-mono text-2xl font-bold text-gray-900 sm:text-3xl">{order.reference || order.order_number}</h1>
            <p className="mt-1 text-sm text-gray-500">{formatOrderDate(order.created_at, true)}</p>
          </div>
          <div className="text-end">
            <Badge status={order.status} />
            <p className="mt-2 text-lg font-bold text-gray-900">{formatMoney(order.total)}</p>
          </div>
        </div>
        {order.has_other_sellers ? (
          <p className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
            {t("This order also has parts from other sellers. You only see and manage your parts.")}
          </p>
        ) : null}

        {next.length ? (
          <div className="mt-5 border-t border-gray-100 pt-5">
            <h2 className="text-base font-bold text-gray-900">{t("Next step")}</h2>
            {order.status === "pending" ? (
              <p className="mt-1 text-sm text-amber-700">{t("Confirm or cancel within 2 working days.")}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-3">
              {forward.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => move(s)}
                  disabled={Boolean(saving)}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {saving === s ? t("Saving…") : t(ACTIONS[s].label)}
                </button>
              ))}
              {canCancel && !cancelOpen ? (
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-red-200 px-5 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  {t(ACTIONS.cancelled.label)}
                </button>
              ) : null}
            </div>
            {forward.map((s) => (
              <p key={s} className="mt-2 text-xs text-gray-500">{t(ACTIONS[s].hint)}</p>
            ))}
            {cancelOpen ? (
              <div className="mt-4 space-y-3 rounded-2xl border border-red-200 bg-red-50/50 p-4">
                <label htmlFor="cancel-note" className="block text-sm font-semibold text-gray-900">
                  {t("Why are you cancelling? The buyer sees this message.")}
                </label>
                <textarea
                  id="cancel-note"
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-400"
                  placeholder={t("e.g. The part was sold in the store")}
                />
                <p className="text-xs text-gray-500">{t(ACTIONS.cancelled.hint)}</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => move("cancelled")}
                    disabled={Boolean(saving)}
                    className="inline-flex h-10 items-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-red-300"
                  >
                    {saving === "cancelled" ? t("Saving…") : t("Confirm cancellation")}
                  </button>
                  <button type="button" onClick={() => setCancelOpen(false)} className="h-10 rounded-xl px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100">
                    {t("Keep the order")}
                  </button>
                </div>
              </div>
            ) : null}
            {actionError ? <p className="mt-3 text-sm text-red-700" role="alert">{actionError}</p> : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">{t("Your parts in this order")}</h2>
            <ul className="mt-4 divide-y divide-gray-100">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <div className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-xl bg-gray-100">
                    {item.image_url ? (
                      <img src={mediaUrl(item.image_url)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Icon name="part" className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">
                      {formatMoney(item.price)} × {item.quantity}
                      {item.sku ? ` · ${item.sku}` : ""}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-mono text-sm font-semibold text-gray-900">{formatMoney(item.subtotal)}</p>
                    {items.length > 1 ? <div className="mt-1"><Badge status={item.status} /></div> : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">{t("History")}</h2>
            <ol className="mt-4 space-y-3">
              <li className="flex gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-gray-300" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-gray-900">{t("Order placed")}</p>
                  <p className="text-xs text-gray-500">{formatOrderDate(order.created_at, true)}</p>
                </div>
              </li>
              {events.map((ev, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className={["mt-1.5 h-2 w-2 flex-none rounded-full", ev.event === "cancelled" ? "bg-red-500" : "bg-blue-500"].join(" ")} aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-gray-900">
                      {statusLabel(ev.event)} <span className="font-normal text-gray-500">· {actorLabel(t, ev.created_by)}</span>
                    </p>
                    {ev.note ? <p className="text-gray-700">{ev.note}</p> : null}
                    <p className="text-xs text-gray-500">{formatOrderDate(ev.created_at, true)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">{t("Delivery")}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-400">{t("Buyer")}</dt>
                <dd className="font-semibold text-gray-900">{order.ship_name || order.buyer_name}</dd>
              </div>
              {order.buyer_phone ? (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-400">{t("Phone")}</dt>
                  <dd className="flex flex-wrap items-center gap-2">
                    <a href={`tel:${order.buyer_phone}`} dir="ltr" className="font-semibold text-blue-700 hover:underline">{order.buyer_phone}</a>
                    {wa ? (
                      <a
                        href={`https://wa.me/${wa}?text=${encodeURIComponent(t("Hello, about your PartHub order {ref}", { ref: order.reference || "" }))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                      >
                        <Icon name="whatsapp" className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                    ) : null}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-400">{t("Address")}</dt>
                <dd className="text-gray-900">{address || "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">{t("Order notes")}</h2>
            <p className="mt-3 whitespace-pre-line text-sm text-gray-700">{order.notes || t("No notes attached to this order.")}</p>
          </div>

          <p className="text-xs text-gray-500">
            <Link to="/legal/returns" target="_blank" rel="noopener" className="font-semibold text-blue-700 hover:underline">
              {t("Returns policy")}
            </Link>
          </p>
        </aside>
      </div>
    </section>
  );
}
