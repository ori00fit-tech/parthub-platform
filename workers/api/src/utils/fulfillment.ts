// Order fulfilment. Each order line (order_items.status) is handled by its
// seller; the order's own status is derived from its lines. See
// infra/d1/migrations/0014_order_fulfillment.sql.

export const LINE_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
export type LineStatus = (typeof LINE_STATUSES)[number];

const RANK: Record<string, number> = { pending: 0, confirmed: 1, processing: 2, shipped: 3, delivered: 4 };

// What a seller may do next with their lines of an order.
export const SELLER_NEXT: Record<string, LineStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const SHIPPING_STATUS: Record<string, string> = {
  pending: "pending",
  confirmed: "pending",
  processing: "packed",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "pending",
};

// The order status for a set of line statuses: the least advanced line that
// is not cancelled; "cancelled" when every line is.
export function rollupStatus(lineStatuses: string[]): LineStatus {
  const active = lineStatuses.filter((s) => s !== "cancelled");
  if (!active.length) return "cancelled";
  let min = active[0] as LineStatus;
  for (const s of active) if ((RANK[s] ?? 0) < (RANK[min] ?? 0)) min = s as LineStatus;
  return min;
}

// Recompute orders.status / shipping_status / delivered_at from the lines,
// and the amounts: cancelled lines are not paid (nothing at all when the
// whole order is cancelled).
export async function refreshOrderStatus(DB: D1Database, orderId: number): Promise<LineStatus> {
  const rows = await DB.prepare("select status, subtotal from order_items where order_id = ?1")
    .bind(orderId)
    .all<{ status: string; subtotal: number }>();
  const lines = rows.results || [];
  const status = rollupStatus(lines.map((r) => r.status));
  const subtotal = lines.filter((l) => l.status !== "cancelled").reduce((sum, l) => sum + Number(l.subtotal || 0), 0);
  await DB.prepare(
    `update orders
     set status = ?1,
         shipping_status = ?2,
         delivered_at = case when ?1 = 'delivered' then coalesce(delivered_at, datetime('now')) else null end,
         subtotal = ?3,
         total = case when ?1 = 'cancelled' then 0 else max(0, ?3 + shipping_fee - discount) end,
         updated_at = datetime('now')
     where id = ?4`
  )
    .bind(status, SHIPPING_STATUS[status] ?? "pending", subtotal, orderId)
    .run();
  return status;
}

export async function logOrderEvent(
  DB: D1Database,
  orderId: number,
  event: string,
  createdBy: string,
  note: string | null = null
): Promise<void> {
  await DB.prepare("insert into order_events (order_id, event, note, created_by) values (?1, ?2, ?3, ?4)")
    .bind(orderId, event, note, createdBy)
    .run();
}

// Set lines to a status. Cancelling puts the quantities back in stock and
// returns the affected part ids (to notify buyers waiting for them).
export async function setLineStatus(
  DB: D1Database,
  lineIds: number[],
  status: LineStatus
): Promise<number[]> {
  if (!lineIds.length) return [];
  const ids = lineIds.map((_, i) => `?${i + 1}`).join(", ");
  const restocked: number[] = [];
  if (status === "cancelled") {
    const lines = await DB.prepare(
      `select part_id, quantity from order_items where id in (${ids}) and status != 'cancelled'`
    )
      .bind(...lineIds)
      .all<{ part_id: number; quantity: number }>();
    for (const line of lines.results || []) {
      await DB.prepare("update parts set quantity = quantity + ?1, updated_at = datetime('now') where id = ?2")
        .bind(line.quantity, line.part_id)
        .run();
      restocked.push(line.part_id);
    }
  }
  await DB.prepare(
    `update order_items
     set status = ?${lineIds.length + 1},
         status_updated_at = datetime('now'),
         delivered_at = case when ?${lineIds.length + 1} = 'delivered' then datetime('now') else delivered_at end
     where id in (${ids})`
  )
    .bind(...lineIds, status)
    .run();
  return restocked;
}
