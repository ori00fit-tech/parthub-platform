import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useT } from "../i18n";

// WhatsApp (API: /api/v1/admin/whatsapp/…, rules in
// workers/api/src/utils/whatsapp.ts, guide in infra/docs/whatsapp.md):
// what is set up, how messages are delivered, and the inbox of messages
// people send to the PartHub number, with replies within 24 hours.

const KIND = {
  new_order: "New order (to the seller)",
  new_request: "New part request (to sellers)",
  new_offer: "New offer (to the buyer)",
  offer_accepted: "Offer accepted (to the seller)",
  back_in_stock: "Back in stock (to the buyer)",
  order_received: "Order received (to the buyer)",
  order_confirmed: "Order confirmed (to the buyer)",
  pickup_ready: "Ready for pickup (to the buyer)",
  order_shipped: "Order shipped (to the buyer)",
  out_for_delivery: "Out for delivery (to the buyer)",
  delivery_attempt_failed: "Delivery attempt failed (to the buyer)",
  order_delivered: "Order delivered (to the buyer)",
  order_cancelled: "Order cancelled (to the buyer)",
  carrier_delivered: "Delivered by the carrier (to the seller)",
  delivery_returned: "Parcel returned (to the seller)",
  claim_opened: "New claim (to the seller)",
  store_approved: "Store approved (to the seller)",
  password_changed: "Password changed (to the account)",
};
const STATUS = { not_sent: "Not sent", skipped: "Not sent (reason logged)", sent: "Sent", delivered: "Delivered", read: "Read", failed: "Failed" };
const time = (v) => String(v || "").slice(0, 16);

function Check({ ok, label }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className={["inline-block h-2.5 w-2.5 rounded-full", ok ? "bg-emerald-500" : "bg-red-500"].join(" ")} />
      <span className={ok ? "text-gray-800" : "font-semibold text-red-700"}>{label}</span>
    </li>
  );
}

function Thread({ phone, onChanged }) {
  const t = useT();
  const [data, setData] = useState(null);
  const [text, setText] = useState("");
  const [state, setState] = useState({ sending: false, error: "" });
  const load = () => api.get(`/api/v1/admin/whatsapp/conversations/${phone}`).then((r) => setData(r?.data || null));
  useEffect(() => {
    load();
  }, [phone]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send(e) {
    e.preventDefault();
    setState({ sending: true, error: "" });
    try {
      await api.post(`/api/v1/admin/whatsapp/conversations/${phone}/reply`, { text });
      setText("");
      setState({ sending: false, error: "" });
      await load();
      onChanged();
    } catch (err) {
      setState({ sending: false, error: err?.message || t("Something went wrong. Please try again.") });
    }
  }

  async function handled() {
    await api.post(`/api/v1/admin/whatsapp/conversations/${phone}/handled`, {});
    onChanged();
  }

  if (!data) return <div className="mt-3 h-20 animate-pulse rounded-2xl bg-gray-50" />;
  return (
    <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-3">
      <ol className="max-h-80 space-y-2 overflow-auto">
        {data.messages.map((m) => (
          <li key={m.id} className={["flex", m.direction === "out" ? "justify-end" : "justify-start"].join(" ")}>
            <div className={["max-w-[85%] rounded-2xl px-3 py-2 text-sm", m.direction === "out" ? "bg-emerald-100 text-gray-900" : "bg-white text-gray-900"].join(" ")}>
              <p className="whitespace-pre-line">{m.body}</p>
              <p className="mt-1 text-[11px] text-gray-500">
                {time(m.created_at)}
                {m.direction === "out" && m.status ? ` · ${t(STATUS[m.status] || m.status)}` : ""}
                {m.error ? <span className="block text-red-700">{m.error}</span> : null}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <form onSubmit={send} className="mt-3 space-y-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={4096} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" placeholder={t("Your reply…")} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={state.sending || !text.trim()} className="h-9 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300">
            {state.sending ? t("Sending…") : t("Send on WhatsApp")}
          </button>
          <button type="button" onClick={handled} className="text-xs font-semibold text-gray-600 hover:underline">{t("Mark handled (no reply)")}</button>
          {state.error ? <span className="text-sm text-red-700" role="alert">{state.error}</span> : null}
        </div>
      </form>
    </div>
  );
}

export default function WhatsAppPage() {
  const t = useT();
  const [status, setStatus] = useState(null);
  const [list, setList] = useState(null);
  const [open, setOpen] = useState("");
  const [error, setError] = useState("");
  const load = () =>
    Promise.all([api.get("/api/v1/admin/whatsapp/status"), api.get("/api/v1/admin/whatsapp/conversations")])
      .then(([s, l]) => {
        setStatus(s?.data || null);
        setList(l?.data || []);
      })
      .catch((err) => setError(err?.message || t("Something went wrong. Please try again.")));
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cfg = status?.configured;
  return (
    <section className="space-y-6 pb-16">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-700 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">WhatsApp</h1>
        <p className="mt-3 max-w-3xl text-sm text-emerald-100 sm:text-base">
          {t("Notifications PartHub sends (new orders, requests, offers, back in stock), whether they arrive, and the messages people send to the PartHub number.")}
        </p>
        <Link to="/whatsapp/templates" className="mt-4 inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-semibold text-gray-950 hover:bg-emerald-50">
          {t("Templates (Arabic, French, English)")} →
        </Link>
      </div>
      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p> : null}

      {status ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
            <h2 className="text-xl font-bold">{t("Set-up")}</h2>
            <ul className="mt-3 space-y-1.5">
              <Check ok={cfg.access_token} label={t("Access token (WHATSAPP_ACCESS_TOKEN)")} />
              <Check ok={cfg.phone_number_id} label={t("Phone number id (WHATSAPP_PHONE_NUMBER_ID)")} />
              <Check ok={cfg.verify_token} label={t("Verify token, 16+ characters (WHATSAPP_VERIFY_TOKEN)")} />
              <Check ok={cfg.app_secret} label={t("App secret, checks Meta's signature (WHATSAPP_APP_SECRET)")} />
            </ul>
            <p className="mt-4 text-xs font-semibold text-gray-700">{t("Callback URL to paste in Meta")}</p>
            <p className="break-all font-mono text-xs" dir="ltr">{status.webhook_url}</p>
            <p className="mt-2 text-xs text-gray-500">{t("Each person gets messages in the language they use PartHub in, when Meta approved it (see Templates).")}</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
            <h2 className="text-xl font-bold">{t("Last 30 days")}</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {status.last_30_days.length ? status.last_30_days.map((s) => (
                <span key={s.status} className={["rounded-full px-3 py-1", s.status === "failed" || s.status === "not_sent" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-800"].join(" ")}>
                  {t(STATUS[s.status] || s.status)}: <b>{s.n}</b>
                </span>
              )) : <span className="text-gray-500">{t("Nothing sent yet.")}</span>}
            </div>
            {status.by_kind.length ? (
              <ul className="mt-3 space-y-1 text-sm">
                {status.by_kind.map((k) => (
                  <li key={k.kind}>{t(KIND[k.kind] || k.kind)} · {k.n} · {t("{n} delivered", { n: k.delivered || 0 })}</li>
                ))}
              </ul>
            ) : null}
            {status.failures.length ? (
              <details className="mt-3 text-xs">
                <summary className="cursor-pointer font-semibold text-red-700">{t("{n} recent failures", { n: status.failures.length })}</summary>
                <ul className="mt-2 space-y-1 text-gray-700">
                  {status.failures.map((f, i) => (
                    <li key={i}>{time(f.status_at)} · {t(KIND[f.kind] || f.kind)} · {f.recipient} · <span className="text-red-700">{f.error || "—"}</span></li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="h-32 animate-pulse rounded-3xl bg-white" />
      )}

      <div className="rounded-3xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
        <h2 className="text-xl font-bold">
          {t("Messages received")} {status?.unread ? <span className="ms-2 rounded-full bg-emerald-600 px-2.5 py-0.5 text-sm text-white">{status.unread}</span> : null}
        </h2>
        <p className="mt-1 text-xs text-gray-500">{t("You can answer freely within 24 hours of their last message (WhatsApp rule). People who write STOP no longer get notifications.")}</p>
        {!list ? null : list.length ? (
          <ul className="mt-4 divide-y divide-gray-100">
            {list.map((cv) => (
              <li key={cv.phone} className="py-3">
                <button type="button" onClick={() => setOpen(open === cv.phone ? "" : cv.phone)} className="flex w-full flex-wrap items-center justify-between gap-2 text-start text-sm">
                  <span>
                    <span className="font-semibold">{cv.who?.name || cv.name || `+${cv.phone}`}</span>
                    <span className="ms-2 font-mono text-xs text-gray-500" dir="ltr">+{cv.phone}</span>
                    {cv.who ? <span className="ms-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{t(cv.who.kind === "seller" ? "Seller" : cv.who.kind === "buyer" ? "Buyer" : cv.who.kind)}</span> : null}
                    {cv.opted_out_at ? <span className="ms-2 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">STOP</span> : null}
                    <span className="mt-0.5 block truncate text-xs text-gray-500">{cv.last_body}</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs">
                    {cv.unread ? <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-semibold text-white">{cv.unread}</span> : null}
                    <span className={cv.window_open ? "text-emerald-700" : "text-gray-400"}>{cv.window_open ? t("Can reply") : t("Template only")}</span>
                    <span className="text-gray-400">{time(cv.last_at)}</span>
                  </span>
                </button>
                {open === cv.phone ? <Thread phone={cv.phone} onChanged={load} /> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-gray-500">{t("No message yet.")}</p>
        )}
      </div>
    </section>
  );
}
