import { useEffect, useState } from "react";
import { shipmentStatusLabel } from "@parthub/shared";
import { api } from "../lib/api";
import { useT } from "../i18n";

// Delivery companies (API: /api/v1/admin/carriers…, rules in
// workers/api/src/utils/carriers.ts, guide in infra/docs/carriers.md).
// Each carrier: public tracking link, and its status webhook: secret (a
// Worker secret, never shown), where its JSON keeps the fields, and how its
// status words map to PartHub statuses. "Test a webhook" reads a sample
// payload without saving anything.

const STATUSES = ["created", "picked_up", "in_transit", "out_for_delivery", "delivered", "failed_attempt", "returning", "returned", "cancelled"];
const pretty = (json) => {
  if (!json) return "";
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
};
const field = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500";

function CarrierEditor({ carrier, onSaved }) {
  const t = useT();
  const [form, setForm] = useState({
    name: carrier.name,
    active: Boolean(carrier.active),
    sort_order: carrier.sort_order,
    tracking_url_template: carrier.tracking_url_template || "",
    webhook_enabled: Boolean(carrier.webhook_enabled),
    field_map: pretty(carrier.field_map),
    status_map: pretty(carrier.status_map),
    notes: carrier.notes || "",
  });
  const [sample, setSample] = useState("");
  const [test, setTest] = useState(null);
  const [events, setEvents] = useState(null);
  const [state, setState] = useState({ saving: false, error: "", ok: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function save(e) {
    e.preventDefault();
    setState({ saving: true, error: "", ok: "" });
    try {
      await api.put(`/api/v1/admin/carriers/${carrier.code}`, form);
      setState({ saving: false, error: "", ok: t("Saved.") });
      onSaved();
    } catch (err) {
      setState({ saving: false, error: err?.message || t("Something went wrong. Please try again."), ok: "" });
    }
  }

  async function runTest() {
    setTest(null);
    setState((s) => ({ ...s, error: "" }));
    try {
      const res = await api.post(`/api/v1/admin/carriers/${carrier.code}/test`, { payload: sample, field_map: form.field_map, status_map: form.status_map });
      setTest(res?.data || null);
    } catch (err) {
      setState((s) => ({ ...s, error: err?.message || t("Something went wrong. Please try again.") }));
    }
  }

  async function loadEvents() {
    const res = await api.get(`/api/v1/admin/carriers/${carrier.code}/events`).catch(() => null);
    setEvents(res?.data || []);
  }

  return (
    <div className="mt-4 space-y-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-gray-800">
          {t("Name")}
          <input value={form.name} onChange={set("name")} className={`${field} mt-1`} />
        </label>
        <label className="text-sm font-semibold text-gray-800">
          {t("Order in the list")}
          <input type="number" value={form.sort_order} onChange={set("sort_order")} className={`${field} mt-1`} />
        </label>
        <label className="text-sm font-semibold text-gray-800 sm:col-span-2">
          {t("Public tracking link (with {tracking} where the number goes)")}
          <input value={form.tracking_url_template} onChange={set("tracking_url_template")} placeholder="https://…?n={tracking}" className={`${field} mt-1 font-mono`} dir="ltr" />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-800">
          <input type="checkbox" checked={form.active} onChange={set("active")} /> {t("Sellers can choose it")}
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-800">
          <input type="checkbox" checked={form.webhook_enabled} onChange={set("webhook_enabled")} /> {t("Receive its status updates (webhook)")}
        </label>

        <div className="rounded-xl bg-white p-3 text-xs text-gray-700 sm:col-span-2">
          <p className="font-semibold text-gray-900">{t("Webhook address to give the carrier")}</p>
          <p className="mt-1 break-all font-mono" dir="ltr">{carrier.webhook_url}</p>
          <p className="mt-2">
            {carrier.secret_configured ? (
              <span className="font-semibold text-emerald-700">{t("Secret set")}</span>
            ) : (
              <span className="font-semibold text-amber-700">{t("No secret yet: updates are refused")}</span>
            )}{" "}
            · <span className="font-mono" dir="ltr">{carrier.secret_name}</span>
          </p>
          <p className="mt-1 text-gray-500">
            {t("Set it once (at least 16 characters) with: wrangler secret put {name}. The carrier signs each call with it (HMAC-SHA256 in X-PartHub-Signature) or sends it as ?token=.", { name: carrier.secret_name })}
          </p>
        </div>

        <label className="text-sm font-semibold text-gray-800">
          {t("Where its JSON keeps the fields (field map)")}
          <textarea rows={7} value={form.field_map} onChange={set("field_map")} className={`${field} mt-1 font-mono text-xs`} dir="ltr"
            placeholder={'{\n  "events": "data.parcels",\n  "tracking": "code",\n  "status": "state",\n  "cod": "amount",\n  "cod_unit": "mad",\n  "time": "updated_at",\n  "note": "comment"\n}'} />
          <span className="mt-1 block text-xs font-normal text-gray-500">{t("Empty: PartHub looks for the usual names (tracking_number, status, cod_amount, updated_at…).")}</span>
        </label>
        <label className="text-sm font-semibold text-gray-800">
          {t("Its status words (status map)")}
          <textarea rows={7} value={form.status_map} onChange={set("status_map")} className={`${field} mt-1 font-mono text-xs`} dir="ltr"
            placeholder={'{\n  "LIVRE": "delivered",\n  "7": "returned"\n}'} />
          <span className="mt-1 block text-xs font-normal text-gray-500">{t("Only for words PartHub does not know. Allowed: {list}", { list: STATUSES.join(", ") })}</span>
        </label>
        <label className="text-sm font-semibold text-gray-800 sm:col-span-2">
          {t("Notes (contract, contact…)")}
          <textarea rows={2} value={form.notes} onChange={set("notes")} className={`${field} mt-1`} />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={state.saving} className="h-10 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300">
            {state.saving ? t("Saving…") : t("Save")}
          </button>
          {state.ok ? <span className="text-sm text-emerald-700" role="status">{state.ok}</span> : null}
          {state.error ? <span className="text-sm text-red-700" role="alert">{state.error}</span> : null}
        </div>
      </form>

      <div>
        <p className="text-sm font-semibold text-gray-900">{t("Test a webhook")}</p>
        <p className="text-xs text-gray-500">{t("Paste a sample the carrier sends. Nothing is saved: you see how PartHub reads it, with the maps above.")}</p>
        <textarea rows={5} value={sample} onChange={(e) => setSample(e.target.value)} className={`${field} mt-2 font-mono text-xs`} dir="ltr" placeholder={'{ "tracking_number": "AB123", "status": "Livré", "cod_amount": 450 }'} />
        <button type="button" onClick={runTest} disabled={!sample.trim()} className="mt-2 h-9 rounded-xl border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-800 hover:bg-gray-100 disabled:opacity-50">
          {t("Read this sample")}
        </button>
        {test ? (
          test.events.length ? (
            <table className="mt-3 min-w-full text-xs">
              <thead className="text-gray-500">
                <tr>
                  <th className="px-2 py-1 text-start">{t("Tracking number")}</th>
                  <th className="px-2 py-1 text-start">{t("Carrier status")}</th>
                  <th className="px-2 py-1 text-start">{t("PartHub status")}</th>
                  <th className="px-2 py-1 text-start">{t("COD")}</th>
                  <th className="px-2 py-1 text-start">{t("Time")}</th>
                  <th className="px-2 py-1 text-start">{t("Order")}</th>
                </tr>
              </thead>
              <tbody>
                {test.events.map((ev, i) => (
                  <tr key={i} className="border-t border-gray-200">
                    <td className="px-2 py-1 font-mono" dir="ltr">{ev.tracking}</td>
                    <td className="px-2 py-1">{ev.carrier_status}</td>
                    <td className={["px-2 py-1 font-semibold", ev.status ? "text-gray-900" : "text-red-700"].join(" ")}>
                      {ev.status ? t(shipmentStatusLabel(ev.status)) : t("Unknown: add it to the status map")}
                    </td>
                    <td className="px-2 py-1 font-mono">{ev.cod != null ? (ev.cod / 100).toFixed(2) : "—"}</td>
                    <td className="px-2 py-1">{ev.occurred_at}</td>
                    <td className="px-2 py-1">{ev.order_id ? `#${ev.order_id}` : t("no shipment with this number")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-2 text-xs text-red-700">{t("No event found: set the field map (tracking and status paths).")}</p>
          )
        ) : null}
      </div>

      <div>
        <button type="button" onClick={loadEvents} className="text-xs font-semibold text-blue-700 hover:underline">
          {t("Latest updates received")}
        </button>
        {events ? (
          events.length ? (
            <ul className="mt-2 max-h-60 space-y-1 overflow-auto text-xs text-gray-700">
              {events.map((e) => (
                <li key={e.id}>
                  {String(e.created_at).slice(0, 16)} · <span className="font-mono" dir="ltr">{e.tracking_number}</span> · {e.carrier_status || "—"} →{" "}
                  <span className="font-semibold">{t(shipmentStatusLabel(e.status))}</span> · {e.reference || t("no matching order")} · {e.source}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-gray-500">{t("Nothing received yet.")}</p>
          )
        ) : null}
      </div>
    </div>
  );
}

// One late parcel: what PartHub learnt from the carrier (phone, portal).
function LateRow({ row, onDone }) {
  const t = useT();
  const [status, setStatus] = useState("out_for_delivery");
  const [note, setNote] = useState("");
  const [cod, setCod] = useState("");
  const [state, setState] = useState({ busy: false, error: "" });
  async function save(e) {
    e.preventDefault();
    setState({ busy: true, error: "" });
    try {
      await api.post(`/api/v1/admin/orders/${row.order_id}/shipment`, { seller_id: row.seller_id, status, note: note.trim() || undefined, cod: status === "delivered" ? cod : undefined });
      setState({ busy: false, error: "" });
      onDone();
    } catch (err) {
      setState({ busy: false, error: err?.message || t("Something went wrong. Please try again.") });
    }
  }
  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          <span className="font-mono font-semibold" dir="ltr">{row.reference}</span>
          <span className="ms-2 text-gray-600">{row.seller_name} → {row.buyer_name}</span>
        </p>
        <p className="text-xs">
          <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700">{t("{n} days without news", { n: row.days })}</span>
          <span className="ms-2 text-gray-600">{t(shipmentStatusLabel(row.status || "in_transit"))}</span>
        </p>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {row.carrier_name || row.carrier || t("No carrier given")}
        {row.tracking_number ? <span className="ms-2 font-mono" dir="ltr">{row.tracking_number}</span> : null}
        {row.attempts ? <span className="ms-2 text-amber-700">{t("{n} failed attempt(s)", { n: row.attempts })}</span> : null}
        {row.delay_notified_at ? <span className="ms-2">· {t("Buyer and seller told")}</span> : null}
      </p>
      <form onSubmit={save} className="mt-2 flex flex-wrap items-center gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-xl border border-gray-200 bg-white px-2 text-xs text-gray-900">
          {["picked_up", "in_transit", "out_for_delivery", "failed_attempt", "returning", "returned", "delivered"].map((s) => (
            <option key={s} value={s}>{t(shipmentStatusLabel(s))}</option>
          ))}
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} dir="auto" placeholder={status === "failed_attempt" ? t("Reason (required)") : t("Note (optional)")} className="h-9 min-w-[10rem] flex-1 rounded-xl border border-gray-200 px-2 text-xs text-gray-900" />
        {status === "delivered" ? (
          <input value={cod} onChange={(e) => setCod(e.target.value)} inputMode="decimal" placeholder={t("Cash collected (MAD)")} className="h-9 w-36 rounded-xl border border-gray-200 px-2 text-xs text-gray-900" />
        ) : null}
        <button type="submit" disabled={state.busy} className="h-9 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300">
          {state.busy ? t("Saving…") : t("Record")}
        </button>
      </form>
      {state.error ? <p className="mt-1 text-xs text-red-700" role="alert">{state.error}</p> : null}
    </li>
  );
}

export default function CarriersPage() {
  const t = useT();
  const [list, setList] = useState(null);
  const [open, setOpen] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState({ code: "", name: "" });
  const [late, setLate] = useState(null);
  const loadLate = () =>
    api
      .get("/api/v1/admin/shipments/late")
      .then((r) => setLate(r?.data || null))
      .catch(() => setLate({ days: 4, shipments: [] }));
  const load = () =>
    api
      .get("/api/v1/admin/carriers")
      .then((r) => setList(r?.data || []))
      .catch((err) => setError(err?.message || t("Something went wrong. Please try again.")));
  useEffect(() => {
    load();
    loadLate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function add(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/api/v1/admin/carriers", adding);
      setAdding({ code: "", name: "" });
      await load();
      setOpen(adding.code.toLowerCase());
    } catch (err) {
      setError(err?.message || t("Something went wrong. Please try again."));
    }
  }

  return (
    <section className="space-y-6 pb-16">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-sky-700 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">{t("Carriers")}</h1>
        <p className="mt-3 max-w-3xl text-sm text-sky-100 sm:text-base">
          {t("The delivery companies sellers can choose, their tracking links, and the status updates they send to PartHub. A delivery confirmed by the carrier closes the order; a parcel returned to the seller cancels it and puts the stock back.")}
        </p>
      </div>
      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p> : null}

      <div className="rounded-3xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
        <h2 className="text-xl font-bold">
          {t("Late shipments")}
          {late?.shipments?.length ? <span className="ms-2 rounded-full bg-red-600 px-2.5 py-0.5 text-sm text-white">{late.shipments.length}</span> : null}
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          {t("Shipped parcels with no update for {n} days or more. Every morning PartHub tells the buyer and the seller once (WhatsApp). Call the carrier, then record what it says: the buyer is informed.", { n: late?.days ?? 4 })}
        </p>
        {!late ? (
          <div className="mt-3 h-16 animate-pulse rounded-2xl bg-gray-50" />
        ) : late.shipments.length ? (
          <ul className="mt-2 divide-y divide-gray-100">
            {late.shipments.map((row) => <LateRow key={row.shipment_id} row={row} onDone={loadLate} />)}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-emerald-700">{t("No late shipment.")}</p>
        )}
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
        {!list ? (
          <div className="h-24 animate-pulse rounded-2xl bg-gray-50" />
        ) : (
          <ul className="divide-y divide-gray-100">
            {list.map((c) => (
              <li key={c.code} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div>
                    <span className="font-semibold">{c.name}</span> <span className="font-mono text-xs text-gray-500" dir="ltr">{c.code}</span>
                    {!c.active ? <span className="ms-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{t("Hidden")}</span> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {c.tracking_url_template ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{t("Tracking link")}</span> : null}
                    {c.webhook_enabled && c.secret_configured ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">{t("Webhook on")}</span>
                    ) : c.webhook_enabled ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">{t("Webhook on, secret missing")}</span>
                    ) : null}
                    {c.events_7d ? <span className="text-gray-600">{t("{n} updates in 7 days", { n: c.events_7d })}</span> : null}
                    {c.unmatched_7d ? <span className="text-red-700">{t("{n} without a matching order", { n: c.unmatched_7d })}</span> : null}
                    <button type="button" onClick={() => setOpen(open === c.code ? "" : c.code)} className="font-semibold text-blue-700 hover:underline">
                      {open === c.code ? t("Close") : t("Set up")}
                    </button>
                  </div>
                </div>
                {open === c.code ? <CarrierEditor carrier={c} onSaved={load} /> : null}
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={add} className="mt-5 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-5">
          <label className="text-sm font-semibold text-gray-800">
            {t("Code")}
            <input value={adding.code} onChange={(e) => setAdding((a) => ({ ...a, code: e.target.value }))} placeholder="speedaf" className={`${field} mt-1 w-36 font-mono`} dir="ltr" />
          </label>
          <label className="text-sm font-semibold text-gray-800">
            {t("Name")}
            <input value={adding.name} onChange={(e) => setAdding((a) => ({ ...a, name: e.target.value }))} placeholder="Speedaf" className={`${field} mt-1 w-56`} />
          </label>
          <button type="submit" disabled={!adding.code || !adding.name} className="h-10 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
            {t("Add a carrier")}
          </button>
        </form>
      </div>
    </section>
  );
}
