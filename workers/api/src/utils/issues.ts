// Returns and complaints on delivered order lines. Rules follow the PartHub
// returns policy (packages/shared/src/legal/content.js) and
// infra/d1/migrations/0015_order_issues.sql.
import { logOrderEvent } from "./fulfillment";

export const RETURN_WINDOW_DAYS = 7;
// The seller has 2 working days to reply; after that the buyer can ask
// PartHub (counted as 3 calendar days to cover a weekend day).
export const SELLER_REPLY_DAYS = 3;
// After the seller accepts, the refund is due within 7 days of the return.
export const REFUND_DAYS = 10;

// Who pays the return, by reason (null: PartHub decides).
export const ISSUE_REASONS: Record<string, "seller" | "buyer" | null> = {
  not_as_described: "seller",
  damaged: "seller",
  not_compatible: "seller",
  hidden_defect: "seller",
  // Marked delivered, but the buyer has nothing: blocks the commission and
  // goes to the seller, then PartHub.
  not_received: "seller",
  wrong_part_ordered: "buyer",
  changed_mind: "buyer",
  other: null,
};

export type IssueRow = {
  id: number;
  order_id: number;
  order_item_id: number;
  buyer_id: number;
  seller_id: number;
  reason: string;
  details: string;
  status: "open" | "accepted" | "refused" | "escalated" | "closed";
  outcome: "buyer" | "seller" | "withdrawn" | null;
  return_paid_by: "seller" | "buyer" | null;
  refund_amount: number | null; // centimes, NULL = the whole line (migrations/0024)
  seller_note: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  seller_replied_at: string | null;
  escalated_at: string | null;
  closed_at: string | null;
};

const ageDays = (value: string | null) => {
  if (!value) return 0;
  const t = Date.parse(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(t) ? 0 : (Date.now() - t) / 86_400_000;
};

// When the buyer may ask PartHub to step in.
export function canEscalate(issue: IssueRow): boolean {
  if (issue.status === "refused") return true;
  if (issue.status === "open") return ageDays(issue.created_at) >= SELLER_REPLY_DAYS;
  if (issue.status === "accepted") return ageDays(issue.seller_replied_at) >= REFUND_DAYS;
  return false;
}

// The issue as shown to buyers, sellers and admins.
export function publicIssue(issue: IssueRow) {
  return { ...issue, can_escalate: canEscalate(issue), can_withdraw: issue.status !== "closed" };
}

export async function issuesForOrder(DB: D1Database, orderId: number, sellerId?: number) {
  const res = await DB.prepare(
    `select * from order_issues where order_id = ?1 ${sellerId ? "and seller_id = ?2" : ""} order by id`
  )
    .bind(...(sellerId ? [orderId, sellerId] : [orderId]))
    .all<IssueRow>();
  return (res.results || []).map(publicIssue);
}

export async function loadIssue(DB: D1Database, id: number): Promise<IssueRow | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  return DB.prepare("select * from order_issues where id = ?1").bind(id).first<IssueRow>();
}

// Apply a change and record it in the order history.
export async function updateIssue(
  DB: D1Database,
  issue: IssueRow,
  fields: Partial<Omit<IssueRow, "id">> & Record<string, unknown>,
  event: string,
  actor: string,
  note: string | null
): Promise<IssueRow> {
  const keys = Object.keys(fields);
  const sets = keys.map((k, i) => `${k} = ?${i + 1}`).join(", ");
  await DB.prepare(`update order_issues set ${sets}, updated_at = datetime('now') where id = ?${keys.length + 1}`)
    .bind(...keys.map((k) => (fields as Record<string, unknown>)[k] ?? null), issue.id)
    .run();
  await logOrderEvent(DB, issue.order_id, event, actor, note);
  return (await loadIssue(DB, issue.id)) as IssueRow;
}

export function cleanNote(value: unknown, max = 1000): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

// "2026-11-06 10:20:00" (UTC), the format D1's datetime('now') uses.
export function nowText(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

// Can the buyer report a problem on this line now?
export function reportWindow(item: { status?: string | null; delivered_at?: string | null }) {
  if (item.status !== "delivered" || !item.delivered_at) return { open: false, until: null as string | null };
  const start = Date.parse(`${item.delivered_at.replace(" ", "T")}Z`);
  if (Number.isNaN(start)) return { open: false, until: null };
  const until = new Date(start + RETURN_WINDOW_DAYS * 86_400_000);
  return { open: Date.now() <= until.getTime(), until: until.toISOString().slice(0, 19).replace("T", " ") };
}
