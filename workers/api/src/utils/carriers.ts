// Carrier integration layer (migrations/0026, infra/docs/carriers.md).
//
// One model for every delivery company:
// - carriers are rows (admin panel), not code;
// - their status updates arrive on one generic webhook,
//   POST /api/v1/carriers/:code/webhook, authenticated with a secret kept
//   as a Worker secret (CARRIER_<CODE>_WEBHOOK_SECRET): HMAC-SHA256 of the
//   body in a signature header, or the secret as a token;
// - each carrier's JSON is read through its field_map (where the tracking
//   number, status, COD amount, time are) and its words through status_map
//   (plus common French / English / Arabic words), into PartHub statuses;
// - events are deduplicated, kept as a timeline, and act on the order:
//   "delivered" by the carrier delivers the seller's shipped lines (proof
//   from the carrier); "returned" closes them as a failed delivery (stock
//   back once).
// Creating shipments at the carrier (outbound API) plugs in per carrier
// through CarrierClient once its API documentation is available; until
// then the seller enters the tracking number (api_client = "manual").

import { logOrderEvent, refreshOrderStatus, setLineStatus } from "./fulfillment";

export const SHIPMENT_STATUSES = [
  "created", "picked_up", "in_transit", "out_for_delivery", "delivered", "failed_attempt", "returning", "returned", "cancelled",
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export type CarrierRow = {
  code: string;
  name: string;
  kind: string;
  active: number;
  sort_order: number;
  tracking_url_template: string | null;
  webhook_enabled: number;
  field_map: string | null;
  status_map: string | null;
  api_client: string;
  notes: string | null;
};

export type FieldMap = {
  events?: string; // path of an array of events (else the body is one event)
  tracking?: string;
  status?: string;
  cod?: string;
  cod_unit?: "mad" | "centimes";
  time?: string;
  note?: string;
};

// Outbound integration, per carrier, once its API is documented.
export interface CarrierClient {
  createShipment(input: { reference: string; to: { name: string; phone: string; city: string; address: string }; cod: number; weightKg?: number | null }): Promise<{ tracking_number: string; label_url?: string }>;
  cancelShipment(trackingNumber: string): Promise<void>;
}
export const API_CLIENTS: Record<string, CarrierClient | null> = { manual: null };

const fold = (s: unknown) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[_\-./]+/g, " ").replace(/\s+/g, " ").trim();

// Common carrier words, checked in this order (negative before positive:
// "non livre" is not "livre"). Matched as whole words or phrases of the
// folded text (no \b: it does not work with Arabic letters).
const WORDS: Array<[ShipmentStatus, string[]]> = [
  ["returned", ["retourne", "retournee", "returned", "return to sender", "rts", "retour effectue", "retour livre", "retour recu", "retour au vendeur", "retour expediteur", "مرتجع", "تم الإرجاع", "رجعات"]],
  ["returning", ["en retour", "retour en cours", "returning", "being returned", "retour"]],
  ["cancelled", ["annule", "annulee", "cancelled", "canceled", "ملغى", "ملغاة"]],
  ["failed_attempt", ["non livre", "non livree", "echec", "echoue", "failed", "refuse", "refusee", "refused", "injoignable", "unreachable", "absent", "reporte", "rescheduled", "not delivered", "لم يتم التسليم", "رفض", "غير متاح"]],
  ["out_for_delivery", ["en cours de livraison", "en livraison", "out for delivery", "mis en distribution", "avec le livreur", "في الطريق للتسليم", "مع الموزع"]],
  ["delivered", ["livre", "livree", "delivered", "distribue", "remis", "تم التسليم", "سلمت", "وصلات"]],
  ["picked_up", ["ramasse", "ramassage effectue", "picked up", "pickup done", "collecte", "recu en agence", "pris en charge", "تم الاستلام من البائع"]],
  ["in_transit", ["en transit", "transit", "in transit", "expedie", "shipped", "en cours", "en route", "arrive", "hub", "في الطريق"]],
  ["created", ["cree", "created", "nouveau", "new", "en attente", "pending", "attente de ramassage", "جديد"]],
];
const DEFAULT_WORDS: Array<[RegExp, ShipmentStatus]> = WORDS.map(([status, words]) => [
  new RegExp(`(^| )(${words.map((w) => fold(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})( |$)`),
  status,
]);

export function normalizeStatus(raw: unknown, statusMap: Record<string, string> = {}): ShipmentStatus | null {
  const v = fold(raw);
  if (!v) return null;
  for (const [their, ours] of Object.entries(statusMap)) {
    if (fold(their) === v && (SHIPMENT_STATUSES as readonly string[]).includes(ours)) return ours as ShipmentStatus;
  }
  if ((SHIPMENT_STATUSES as readonly string[]).includes(v.replace(/ /g, "_"))) return v.replace(/ /g, "_") as ShipmentStatus;
  for (const [re, status] of DEFAULT_WORDS) if (re.test(v)) return status;
  return null;
}

// "data.items.0.code" in an object.
export function readPath(obj: unknown, path: string | undefined): unknown {
  if (!path) return undefined;
  return path.split(".").reduce<unknown>((o, k) => (o != null && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

const GUESS = {
  tracking: ["tracking_number", "trackingNumber", "tracking", "tracking_code", "code", "barcode", "awb", "colis", "parcel", "reference", "ref"],
  status: ["status", "state", "statut", "etat", "status_name", "event"],
  cod: ["cod", "cod_amount", "codAmount", "amount", "montant", "price", "prix", "collected"],
  time: ["updated_at", "updatedAt", "date", "datetime", "timestamp", "time", "event_date", "created_at"],
  note: ["comment", "note", "message", "reason", "motif", "remarque", "description"],
};
function guess(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  for (const nest of ["data", "parcel", "shipment", "colis", "delivery"]) {
    const inner = obj[nest];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      for (const k of keys) {
        const v = (inner as Record<string, unknown>)[k];
        if (v !== undefined && v !== null && v !== "") return v;
      }
    }
  }
  return undefined;
}

function toTime(v: unknown): string {
  if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v).toISOString().slice(0, 19).replace("T", " ");
  const t = Date.parse(String(v ?? "").replace(" ", "T"));
  return Number.isNaN(t) ? new Date().toISOString().slice(0, 19).replace("T", " ") : new Date(t).toISOString().slice(0, 19).replace("T", " ");
}

export type ParsedEvent = { tracking: string; carrier_status: string; status: ShipmentStatus | null; cod: number | null; occurred_at: string; note: string | null };

export function parseJson<T>(text: string | null, fallback: T): T {
  if (!text) return fallback;
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

// A webhook body → events, through the carrier's maps.
export function parseWebhook(carrier: Pick<CarrierRow, "field_map" | "status_map">, body: unknown): ParsedEvent[] {
  const fm = parseJson<FieldMap>(carrier.field_map, {});
  const sm = parseJson<Record<string, string>>(carrier.status_map, {});
  const list = fm.events ? readPath(body, fm.events) : Array.isArray(body) ? body : [body];
  const items = Array.isArray(list) ? list : [list];
  const out: ParsedEvent[] = [];
  for (const it of items.slice(0, 100)) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const pick = (key: keyof typeof GUESS) => (fm[key] ? readPath(o, fm[key]) : guess(o, GUESS[key]));
    const tracking = String(pick("tracking") ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
    const rawStatus = String(pick("status") ?? "").trim().slice(0, 120);
    if (!tracking || !rawStatus) continue;
    const codRaw = pick("cod");
    const codNum = codRaw === undefined || codRaw === null || codRaw === "" ? null : Number(String(codRaw).replace(",", "."));
    const cod = codNum === null || !Number.isFinite(codNum) || codNum < 0 ? null : fm.cod_unit === "centimes" ? Math.round(codNum) : Math.round(codNum * 100);
    const note = pick("note");
    out.push({
      tracking,
      carrier_status: rawStatus,
      status: normalizeStatus(rawStatus, sm),
      cod,
      occurred_at: toTime(pick("time")),
      note: note == null || note === "" ? null : String(note).slice(0, 300),
    });
  }
  return out;
}

// ── Webhook authentication ─────────────────────────────────────────────
export function secretName(code: string): string {
  return `CARRIER_${code.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_WEBHOOK_SECRET`;
}

function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// "ok", "no_secret" (webhook not set up), or "bad" (wrong signature / token).
export async function verifyWebhook(env: unknown, code: string, req: Request, rawBody: string): Promise<"ok" | "no_secret" | "bad"> {
  const secret = String((env as Record<string, unknown>)?.[secretName(code)] ?? "");
  if (secret.length < 16) return "no_secret";
  const sigHeader = req.headers.get("x-parthub-signature") || req.headers.get("x-signature") || req.headers.get("x-hub-signature-256") || "";
  if (sigHeader) {
    const got = sigHeader.replace(/^sha256=/i, "").trim().toLowerCase();
    return sameText(got, await hmacHex(secret, rawBody)) ? "ok" : "bad";
  }
  const token = new URL(req.url).searchParams.get("token") || req.headers.get("x-webhook-token") || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return token && sameText(token, secret) ? "ok" : "bad";
}

// ── Applying events ────────────────────────────────────────────────────
type ShipmentRow = { id: number; order_id: number; seller_id: number; status: string | null; status_at: string | null };

export type ApplyResult = "applied" | "duplicate" | "unknown_shipment" | "unknown_status";

export const trackingKey = (t: string) => String(t || "").toUpperCase().replace(/[\s\-./]/g, "");

export async function findShipment(DB: D1Database, carrier: string, tracking: string): Promise<ShipmentRow | null> {
  // Same number whatever the formatting ("SD-3003", "sd 3003", "SD.3003").
  return DB.prepare(
    `select id, order_id, seller_id, status, status_at from order_shipments
     where carrier = ?1 and upper(replace(replace(replace(replace(tracking_number, ' ', ''), '-', ''), '.', ''), '/', '')) = ?2
     order by id desc limit 1`
  ).bind(carrier, trackingKey(tracking)).first<ShipmentRow>();
}

export async function recordEvent(
  DB: D1Database,
  carrier: string,
  ev: ParsedEvent,
  source: "carrier" | "seller" | "admin"
): Promise<{ result: ApplyResult; shipment_id: number | null }> {
  const shipment = await findShipment(DB, carrier, ev.tracking);
  const status = ev.status;
  const key = `${carrier}|${trackingKey(ev.tracking)}|${fold(ev.carrier_status)}|${ev.occurred_at}`;
  const ins = await DB.prepare(
    `insert or ignore into shipment_events (shipment_id, carrier, tracking_number, status, carrier_status, note, cod_amount, occurred_at, source, dedupe_key)
     values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
  ).bind(shipment?.id ?? null, carrier, ev.tracking, status ?? "unknown", ev.carrier_status, ev.note, ev.cod, ev.occurred_at, source, key).run();
  if (!Number(ins.meta?.changes)) return { result: "duplicate", shipment_id: shipment?.id ?? null };
  if (!shipment) return { result: "unknown_shipment", shipment_id: null };
  if (!status) return { result: "unknown_status", shipment_id: shipment.id };

  // Which status the shipment shows. Events arrive out of order and carrier
  // clocks differ, so: a final status (delivered / returned / cancelled)
  // beats an in-progress one; an in-progress one never replaces a final one
  // (timeline only); between two of the same kind, the latest wins.
  const final = (x: string | null) => x === "delivered" || x === "returned" || x === "cancelled";
  const later = !shipment.status_at || ev.occurred_at >= shipment.status_at;
  const newer = final(status) ? !final(shipment.status) || later : !final(shipment.status) && later;
  await DB.prepare(
    `update order_shipments set
       status = case when ?2 then ?3 else status end,
       status_at = case when ?2 then ?4 else status_at end,
       attempts = attempts + case when ?3 = 'failed_attempt' then 1 else 0 end,
       carrier_delivered_at = case when ?3 = 'delivered' then coalesce(carrier_delivered_at, ?4) else carrier_delivered_at end,
       cod_collected = case when ?3 = 'delivered' and ?5 is not null then ?5 else cod_collected end
     where id = ?1`
  ).bind(shipment.id, newer ? 1 : 0, status, ev.occurred_at, ev.cod).run();

  // Effects on the seller's lines of that order (only shipped delivery lines).
  if (status === "delivered" || status === "returned") {
    const lines = await DB.prepare(
      "select id from order_items where order_id = ?1 and seller_id = ?2 and status = 'shipped' and fulfillment = 'delivery'"
    ).bind(shipment.order_id, shipment.seller_id).all<{ id: number }>();
    const ids = (lines.results || []).map((l) => l.id);
    if (ids.length) {
      await setLineStatus(DB, ids, status === "delivered" ? "delivered" : "cancelled");
      await logOrderEvent(
        DB, shipment.order_id, status === "delivered" ? "delivered_by_carrier" : "delivery_failed", `carrier:${carrier}`,
        status === "delivered" ? ev.note : `Returned by the carrier${ev.note ? `: ${ev.note}` : ""}`
      );
      await refreshOrderStatus(DB, shipment.order_id);
    }
  } else if (status === "failed_attempt") {
    await logOrderEvent(DB, shipment.order_id, "delivery_attempt_failed", `carrier:${carrier}`, ev.note);
  }
  return { result: "applied", shipment_id: shipment.id };
}

// ── Reading / editing carriers ─────────────────────────────────────────
export async function listCarriers(DB: D1Database, activeOnly = false): Promise<CarrierRow[]> {
  const res = await DB.prepare(`select * from carriers ${activeOnly ? "where active = 1" : ""} order by sort_order, name`).all<CarrierRow>();
  return res.results || [];
}

export async function loadCarrier(DB: D1Database, code: string): Promise<CarrierRow | null> {
  return DB.prepare("select * from carriers where code = ?1").bind(String(code || "").toLowerCase()).first<CarrierRow>();
}

export function trackingUrl(template: string | null | undefined, tracking: string | null | undefined): string | null {
  if (!template || !tracking) return null;
  return template.replace("{tracking}", encodeURIComponent(tracking));
}

// Admin input → a clean carrier update, or an error.
export function readCarrierInput(body: Record<string, unknown>): { ok: true; values: Record<string, unknown> } | { ok: false; error: string } {
  const v: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const n = String(body.name).trim().slice(0, 80);
    if (n.length < 2) return { ok: false, error: "Give the carrier's name" };
    v.name = n;
  }
  if (body.active !== undefined) v.active = body.active ? 1 : 0;
  if (body.webhook_enabled !== undefined) v.webhook_enabled = body.webhook_enabled ? 1 : 0;
  if (body.sort_order !== undefined) v.sort_order = Math.max(0, Math.min(9999, Number(body.sort_order) || 0));
  if (body.kind !== undefined) {
    if (!["courier", "postal", "own", "other"].includes(String(body.kind))) return { ok: false, error: "Unknown kind" };
    v.kind = String(body.kind);
  }
  if (body.tracking_url_template !== undefined) {
    const t = String(body.tracking_url_template || "").trim();
    if (t && (!/^https:\/\/[^\s"'<>]+$/i.test(t) || !t.includes("{tracking}") || t.length > 300)) {
      return { ok: false, error: "The tracking link must start with https:// and contain {tracking}" };
    }
    v.tracking_url_template = t || null;
  }
  for (const key of ["field_map", "status_map"] as const) {
    if (body[key] === undefined) continue;
    const raw = body[key];
    if (raw === null || raw === "") {
      v[key] = null;
      continue;
    }
    let obj: unknown = raw;
    if (typeof raw === "string") {
      try {
        obj = JSON.parse(raw);
      } catch {
        return { ok: false, error: `${key} is not valid JSON` };
      }
    }
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { ok: false, error: `${key} must be a JSON object` };
    if (key === "status_map") {
      for (const [k, s] of Object.entries(obj as Record<string, unknown>)) {
        if (!(SHIPMENT_STATUSES as readonly string[]).includes(String(s))) return { ok: false, error: `status_map: "${k}" must map to one of ${SHIPMENT_STATUSES.join(", ")}` };
      }
    } else {
      for (const [k, s] of Object.entries(obj as Record<string, unknown>)) {
        if (!["events", "tracking", "status", "cod", "cod_unit", "time", "note"].includes(k)) return { ok: false, error: `field_map: unknown key "${k}"` };
        if (k === "cod_unit" ? !["mad", "centimes"].includes(String(s)) : typeof s !== "string") return { ok: false, error: `field_map: bad value for "${k}"` };
      }
    }
    const text = JSON.stringify(obj);
    if (text.length > 4000) return { ok: false, error: `${key} is too long` };
    v[key] = text;
  }
  if (body.notes !== undefined) v.notes = String(body.notes || "").trim().slice(0, 1000) || null;
  return { ok: true, values: v };
}

// A carrier code the seller may choose: an active carrier of the table.
export async function validCarrier(DB: D1Database, value: unknown): Promise<string | null> {
  const code = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9]{2,30}$/.test(code)) return null;
  const row = await DB.prepare("select code from carriers where code = ?1 and active = 1").bind(code).first<{ code: string }>();
  return row?.code ?? null;
}

// The seller (or admin) moved their lines: same timeline as the carrier's
// events, and the shipment's current status.
export async function noteShipment(
  DB: D1Database,
  orderId: number,
  sellerId: number,
  status: ShipmentStatus,
  source: "seller" | "admin",
  note: string | null
): Promise<void> {
  const sh = await DB.prepare("select id, carrier, tracking_number from order_shipments where order_id = ?1 and seller_id = ?2")
    .bind(orderId, sellerId).first<{ id: number; carrier: string | null; tracking_number: string | null }>();
  if (!sh) return;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await DB.batch([
    DB.prepare("update order_shipments set status = ?2, status_at = ?3 where id = ?1").bind(sh.id, status, now),
    DB.prepare(
      `insert or ignore into shipment_events (shipment_id, carrier, tracking_number, status, carrier_status, note, occurred_at, source, dedupe_key)
       values (?1, ?2, ?3, ?4, null, ?5, ?6, ?7, ?8)`
    ).bind(sh.id, sh.carrier || "other", sh.tracking_number, status, note, now, source, `${source}|${sh.id}|${status}|${now}|${crypto.randomUUID()}`),
  ]);
}

// Timeline of a shipment, oldest first (buyer and seller pages).
export async function shipmentTimeline(DB: D1Database, shipmentIds: number[]) {
  if (!shipmentIds.length) return [];
  const res = await DB.prepare(
    `select shipment_id, status, carrier_status, note, occurred_at, source from shipment_events
     where shipment_id in (${shipmentIds.map((_, i) => `?${i + 1}`).join(",")}) order by occurred_at, id`
  ).bind(...shipmentIds).all<{ shipment_id: number; status: string; carrier_status: string | null; note: string | null; occurred_at: string; source: string }>();
  return res.results || [];
}
