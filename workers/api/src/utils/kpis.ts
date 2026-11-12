// Investor KPIs: the marketplace's monthly figures, computed from the
// production data (no estimate, no manual input). Months are calendar
// months in UTC. Money in centimes.
//
// Supply   : stores (new, selling), parts listed (new, active, with a photo,
//            with vehicles)
// Demand   : new buyer accounts, buyers who ordered, repeat buyers, part
//            requests, searches (and those with no result)
// Business : orders placed, GMV placed (all lines), GMV delivered (by
//            delivery month), delivered orders, average delivered order
// Quality  : by month an order was placed (cohort): lines delivered /
//            cancelled by the seller / failed delivery / still open,
//            delivery success = delivered / (lines that reached an end);
//            returns resolved for the buyer per line delivered; days from
//            order to delivery
// Revenue  : commission recorded (0 while selling is free)

import { lastPeriods } from "./commissions";

export type MonthKpis = {
  period: string;
  sellers_new: number;
  sellers_selling: number;
  parts_new: number;
  buyers_new: number;
  buyers_ordering: number;
  buyers_repeat: number;
  requests: number;
  searches: number;
  searches_no_result: number;
  orders: number;
  gmv_placed: number;
  gmv_delivered: number;
  orders_delivered: number;
  aov_delivered: number | null;
  lines_placed: number;
  lines_delivered: number;
  lines_cancelled: number;
  lines_failed_delivery: number;
  lines_open: number;
  delivery_success_rate: number | null;
  lines_delivered_in_month: number;
  returns_for_buyer: number;
  return_rate: number | null;
  avg_days_to_delivery: number | null;
  commission: number;
};

const num = (v: unknown) => Number(v || 0);
const ratio = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 1000 : null);

async function byMonth(DB: D1Database, sql: string, binds: unknown[]): Promise<Map<string, Record<string, number>>> {
  try {
    const res = await DB.prepare(sql).bind(...binds).all<Record<string, unknown>>();
    const map = new Map<string, Record<string, number>>();
    for (const r of res.results || []) {
      const { period, ...rest } = r;
      map.set(String(period), Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, num(v)])));
    }
    return map;
  } catch {
    return new Map(); // a table not created yet (old environment): zeros
  }
}

async function one(DB: D1Database, sql: string): Promise<Record<string, number>> {
  try {
    const r = await DB.prepare(sql).first<Record<string, unknown>>();
    return Object.fromEntries(Object.entries(r || {}).map(([k, v]) => [k, num(v)]));
  } catch {
    return {};
  }
}

export async function investorKpis(DB: D1Database, months = 12, now = new Date()) {
  const last = now.toISOString().slice(0, 7);
  const periods = lastPeriods(last, Math.max(1, Math.min(36, months)));
  const from = periods[0]!;
  const range = [from, last];
  const m = (col: string) => `substr(${col}, 1, 7)`;
  const inRange = (col: string) => `${m(col)} BETWEEN ?1 AND ?2`;

  const [sellersNew, selling, partsNew, buyersNew, ordering, repeat, requests, searches, placed, delivered, cohort, returns, commission] = await Promise.all([
    byMonth(DB, `SELECT ${m("created_at")} AS period, COUNT(*) AS n FROM sellers WHERE ${inRange("created_at")} GROUP BY 1`, range),
    byMonth(DB, `SELECT ${m("o.created_at")} AS period, COUNT(DISTINCT oi.seller_id) AS n FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE ${inRange("o.created_at")} GROUP BY 1`, range),
    byMonth(DB, `SELECT ${m("created_at")} AS period, COUNT(*) AS n FROM parts WHERE ${inRange("created_at")} GROUP BY 1`, range),
    byMonth(DB, `SELECT ${m("created_at")} AS period, COUNT(*) AS n FROM users WHERE role = 'buyer' AND ${inRange("created_at")} GROUP BY 1`, range),
    byMonth(DB, `SELECT ${m("created_at")} AS period, COUNT(DISTINCT buyer_id) AS n, COUNT(*) AS orders FROM orders WHERE ${inRange("created_at")} GROUP BY 1`, range),
    // Buyers of the month who had already ordered in an earlier month.
    byMonth(
      DB,
      `SELECT ${m("o.created_at")} AS period, COUNT(DISTINCT o.buyer_id) AS n FROM orders o
       WHERE ${inRange("o.created_at")} AND EXISTS (SELECT 1 FROM orders p WHERE p.buyer_id = o.buyer_id AND ${m("p.created_at")} < ${m("o.created_at")})
       GROUP BY 1`,
      range
    ),
    byMonth(DB, `SELECT ${m("created_at")} AS period, COUNT(*) AS n FROM part_requests WHERE ${inRange("created_at")} GROUP BY 1`, range),
    byMonth(DB, `SELECT ${m("created_at")} AS period, COUNT(*) AS n, SUM(CASE WHEN results_count = 0 THEN 1 ELSE 0 END) AS none FROM part_search_logs WHERE ${inRange("created_at")} GROUP BY 1`, range),
    byMonth(DB, `SELECT ${m("o.created_at")} AS period, COALESCE(SUM(oi.subtotal), 0) AS gmv FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE ${inRange("o.created_at")} GROUP BY 1`, range),
    byMonth(
      DB,
      `SELECT ${m("oi.delivered_at")} AS period, COALESCE(SUM(oi.subtotal), 0) AS gmv, COUNT(DISTINCT oi.order_id) AS orders, COUNT(*) AS lines,
              AVG(julianday(oi.delivered_at) - julianday(o.created_at)) AS days
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE oi.status = 'delivered' AND oi.delivered_at IS NOT NULL AND ${inRange("oi.delivered_at")} GROUP BY 1`,
      range
    ),
    // Cohort by order month: where its lines ended. A cancelled line whose
    // seller had shipped = failed delivery (refused, unreachable, returned).
    byMonth(
      DB,
      `SELECT ${m("o.created_at")} AS period, COUNT(*) AS lines,
              SUM(CASE WHEN oi.status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
              SUM(CASE WHEN oi.status = 'cancelled' AND sh.shipped_at IS NOT NULL THEN 1 ELSE 0 END) AS failed,
              SUM(CASE WHEN oi.status = 'cancelled' AND sh.shipped_at IS NULL THEN 1 ELSE 0 END) AS cancelled
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       LEFT JOIN order_shipments sh ON sh.order_id = oi.order_id AND sh.seller_id = oi.seller_id
       WHERE ${inRange("o.created_at")} GROUP BY 1`,
      range
    ),
    // Claims resolved for the buyer, on lines delivered that month.
    byMonth(
      DB,
      `SELECT ${m("oi.delivered_at")} AS period, COUNT(DISTINCT i.order_item_id) AS n
       FROM order_issues i JOIN order_items oi ON oi.id = i.order_item_id
       WHERE i.status = 'closed' AND i.outcome = 'buyer' AND oi.delivered_at IS NOT NULL AND ${inRange("oi.delivered_at")} GROUP BY 1`,
      range
    ),
    byMonth(DB, `SELECT period, COALESCE(SUM(CASE WHEN status != 'waived' THEN amount ELSE 0 END), 0) AS n FROM commissions WHERE period BETWEEN ?1 AND ?2 GROUP BY 1`, range),
  ]);

  const months_: MonthKpis[] = periods.map((p) => {
    const g = (map: Map<string, Record<string, number>>, k: string) => num(map.get(p)?.[k]);
    const linesPlaced = g(cohort, "lines");
    const linesDelivered = g(cohort, "delivered");
    const linesCancelled = g(cohort, "cancelled");
    const linesFailed = g(cohort, "failed");
    const ended = linesDelivered + linesCancelled + linesFailed;
    const deliveredInMonth = g(delivered, "lines");
    const days = delivered.get(p)?.days;
    return {
      period: p,
      sellers_new: g(sellersNew, "n"),
      sellers_selling: g(selling, "n"),
      parts_new: g(partsNew, "n"),
      buyers_new: g(buyersNew, "n"),
      buyers_ordering: g(ordering, "n"),
      buyers_repeat: g(repeat, "n"),
      requests: g(requests, "n"),
      searches: g(searches, "n"),
      searches_no_result: g(searches, "none"),
      orders: g(ordering, "orders"),
      gmv_placed: g(placed, "gmv"),
      gmv_delivered: g(delivered, "gmv"),
      orders_delivered: g(delivered, "orders"),
      aov_delivered: g(delivered, "orders") ? Math.round(g(delivered, "gmv") / g(delivered, "orders")) : null,
      lines_placed: linesPlaced,
      lines_delivered: linesDelivered,
      lines_cancelled: linesCancelled,
      lines_failed_delivery: linesFailed,
      lines_open: Math.max(0, linesPlaced - ended),
      // Delivered vs not, among lines that reached an end (seller
      // cancellations before shipping count as not delivered).
      delivery_success_rate: ratio(linesDelivered, ended),
      lines_delivered_in_month: deliveredInMonth,
      returns_for_buyer: g(returns, "n"),
      return_rate: ratio(g(returns, "n"), deliveredInMonth),
      avg_days_to_delivery: days === undefined || !deliveredInMonth ? null : Math.round(days * 10) / 10,
      commission: g(commission, "n"),
    };
  });

  // Where the marketplace stands today.
  const now_ = {
    ...(await one(
      DB,
      `SELECT (SELECT COUNT(*) FROM sellers WHERE status = 'active') AS sellers_active,
              (SELECT COUNT(*) FROM sellers WHERE status = 'pending') AS sellers_pending,
              (SELECT COUNT(*) FROM parts p JOIN sellers s ON s.id = p.seller_id WHERE p.status = 'active' AND s.status = 'active') AS parts_active,
              (SELECT COUNT(*) FROM parts p JOIN sellers s ON s.id = p.seller_id WHERE p.status = 'active' AND s.status = 'active'
                 AND EXISTS (SELECT 1 FROM part_images i WHERE i.part_id = p.id)) AS parts_with_photo,
              (SELECT COUNT(*) FROM parts p JOIN sellers s ON s.id = p.seller_id WHERE p.status = 'active' AND s.status = 'active'
                 AND EXISTS (SELECT 1 FROM part_compatibility pc WHERE pc.part_id = p.id)) AS parts_with_vehicles,
              (SELECT COUNT(*) FROM users WHERE role = 'buyer') AS buyers_total,
              (SELECT COUNT(DISTINCT buyer_id) FROM orders) AS buyers_ordered,
              (SELECT COUNT(*) FROM (SELECT buyer_id FROM orders GROUP BY buyer_id HAVING COUNT(*) >= 2)) AS buyers_repeat_total,
              (SELECT COUNT(*) FROM orders) AS orders_total,
              (SELECT COALESCE(SUM(subtotal), 0) FROM order_items WHERE status = 'delivered') AS gmv_delivered_total,
              (SELECT COUNT(*) FROM vehicle_generations) AS vehicle_generations,
              (SELECT COUNT(*) FROM vehicle_makes) AS vehicle_makes`
    )),
  };
  return { generated_at: now.toISOString(), first_period: from, last_period: last, now: now_, months: months_ };
}

// The months as CSV (data room). Money in MAD, rates as %.
export function kpisCsv(months: MonthKpis[]): string {
  const cols: Array<[string, (m: MonthKpis) => string | number]> = [
    ["month", (m) => m.period],
    ["stores_new", (m) => m.sellers_new],
    ["stores_selling", (m) => m.sellers_selling],
    ["parts_new", (m) => m.parts_new],
    ["buyer_accounts_new", (m) => m.buyers_new],
    ["buyers_ordering", (m) => m.buyers_ordering],
    ["repeat_buyers", (m) => m.buyers_repeat],
    ["part_requests", (m) => m.requests],
    ["searches", (m) => m.searches],
    ["searches_no_result", (m) => m.searches_no_result],
    ["orders", (m) => m.orders],
    ["gmv_placed_mad", (m) => (m.gmv_placed / 100).toFixed(2)],
    ["gmv_delivered_mad", (m) => (m.gmv_delivered / 100).toFixed(2)],
    ["orders_delivered", (m) => m.orders_delivered],
    ["avg_delivered_order_mad", (m) => (m.aov_delivered == null ? "" : (m.aov_delivered / 100).toFixed(2))],
    ["lines_placed", (m) => m.lines_placed],
    ["lines_delivered", (m) => m.lines_delivered],
    ["lines_cancelled_by_seller", (m) => m.lines_cancelled],
    ["lines_failed_delivery", (m) => m.lines_failed_delivery],
    ["lines_open", (m) => m.lines_open],
    ["delivery_success_pct", (m) => (m.delivery_success_rate == null ? "" : (m.delivery_success_rate * 100).toFixed(1))],
    ["returns_for_buyer", (m) => m.returns_for_buyer],
    ["return_rate_pct", (m) => (m.return_rate == null ? "" : (m.return_rate * 100).toFixed(1))],
    ["avg_days_to_delivery", (m) => (m.avg_days_to_delivery == null ? "" : m.avg_days_to_delivery)],
    ["commission_mad", (m) => (m.commission / 100).toFixed(2)],
  ];
  const esc = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  return [cols.map(([h]) => h).join(","), ...months.map((m) => cols.map(([, f]) => esc(f(m))).join(","))].join("\n") + "\n";
}
