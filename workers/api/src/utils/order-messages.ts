// ============================================================
// Questions about an order (migrations/0042): one conversation per order
// and seller, between the buyer and that seller. PartHub reads them in a
// dispute. Rules:
//  - only the order's buyer and the sellers in that order write;
//  - 1 to 1000 characters; at most 30 messages a day per person and
//    conversation;
//  - WhatsApp to the other side for the first unread message only (no
//    message per line typed): parthub_order_question / parthub_order_answer;
//  - opening the conversation marks the other side's messages read.
// ============================================================
import type { Env } from "../types";
import { waOrderAnswer, waOrderQuestion } from "./wa-events";

export const MESSAGE_MAX = 1000;
export const MESSAGES_PER_DAY = 30;

export type Sender = "buyer" | "seller" | "admin";
export type MessageRow = { id: number; sender: Sender; body: string; created_at: string; read_at: string | null };

export async function thread(DB: D1Database, orderId: number, sellerId: number): Promise<MessageRow[]> {
  const rows = await DB.prepare(
    "select id, sender, body, created_at, read_at from order_messages where order_id = ?1 and seller_id = ?2 order by id asc limit 500"
  ).bind(orderId, sellerId).all<MessageRow>();
  return rows.results || [];
}

// The reader opened the conversation: what the other side wrote is read.
export async function markRead(DB: D1Database, orderId: number, sellerId: number, reader: "buyer" | "seller"): Promise<void> {
  const other = reader === "buyer" ? "seller" : "buyer";
  await DB.prepare(
    "update order_messages set read_at = datetime('now') where order_id = ?1 and seller_id = ?2 and sender = ?3 and read_at is null"
  ).bind(orderId, sellerId, other).run();
}

export function readBody(raw: unknown): { ok: true; body: string } | { ok: false; error: string } {
  const body = typeof raw === "string" ? raw.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() : "";
  if (!body) return { ok: false, error: "Write your message" };
  if (body.length > MESSAGE_MAX) return { ok: false, error: `At most ${MESSAGE_MAX} characters` };
  return { ok: true, body };
}

// Writes a message; tells the other side on WhatsApp when it is the first
// one they have not read yet. `background` runs the WhatsApp call after the
// answer (c.executionCtx.waitUntil in the routes).
export async function postMessage(
  env: Env,
  m: { orderId: number; sellerId: number; sender: "buyer" | "seller"; senderId: number; body: string },
  background: (p: Promise<unknown>) => void
): Promise<{ ok: true; message: MessageRow } | { ok: false; error: string; status: 429 }> {
  const today = await env.DB.prepare(
    "select count(*) as n from order_messages where order_id = ?1 and seller_id = ?2 and sender = ?3 and created_at > datetime('now', '-1 day')"
  ).bind(m.orderId, m.sellerId, m.sender).first<{ n: number }>();
  if (Number(today?.n || 0) >= MESSAGES_PER_DAY) return { ok: false, error: "Too many messages today on this order. Try again tomorrow.", status: 429 };
  const unreadBefore = await env.DB.prepare(
    "select count(*) as n from order_messages where order_id = ?1 and seller_id = ?2 and sender = ?3 and read_at is null"
  ).bind(m.orderId, m.sellerId, m.sender).first<{ n: number }>();
  const res = await env.DB.prepare(
    "insert into order_messages (order_id, seller_id, sender, sender_id, body) values (?1, ?2, ?3, ?4, ?5)"
  ).bind(m.orderId, m.sellerId, m.sender, m.senderId, m.body).run();
  const id = Number(res.meta?.last_row_id);
  // Writing answers the other side: their messages are read now.
  await markRead(env.DB, m.orderId, m.sellerId, m.sender);
  if (!Number(unreadBefore?.n || 0)) background(m.sender === "buyer" ? waOrderQuestion(env, id) : waOrderAnswer(env, id));
  const message = await env.DB.prepare("select id, sender, body, created_at, read_at from order_messages where id = ?1").bind(id).first<MessageRow>();
  return { ok: true, message: message! };
}
