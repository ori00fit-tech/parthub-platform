// Slows down password guessing and sign-up spam (table auth_attempts,
// migrations/0021). A key ("login:email:x", "login:ip:1.2.3.4",
// "register:ip:...") counts events in a window; at the limit it is blocked
// for BLOCK_MINUTES.

export type Limit = { max: number; windowMinutes: number; blockMinutes: number };

export const LIMITS = {
  loginEmail: { max: 10, windowMinutes: 15, blockMinutes: 15 }, // one account
  loginIp: { max: 30, windowMinutes: 15, blockMinutes: 15 }, // one network (shared mobile IPs: higher)
  registerIp: { max: 10, windowMinutes: 60, blockMinutes: 60 },
} satisfies Record<string, Limit>;

const sqlTime = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
const fromSql = (s: string) => new Date(`${s.replace(" ", "T")}Z`);

export function clientIp(headers: { get(name: string): string | null | undefined }): string {
  return (headers.get("cf-connecting-ip") || headers.get("x-forwarded-for")?.split(",")[0] || "unknown").trim().slice(0, 64);
}

// Minutes left if blocked, else 0.
export async function blockedFor(DB: D1Database, keys: string[], now = new Date()): Promise<number> {
  if (!keys.length) return 0;
  const res = await DB.prepare(
    `select blocked_until from auth_attempts where key in (${keys.map((_, i) => `?${i + 1}`).join(",")}) and blocked_until is not null`
  ).bind(...keys).all<{ blocked_until: string }>();
  let ms = 0;
  for (const r of res.results || []) ms = Math.max(ms, fromSql(r.blocked_until).getTime() - now.getTime());
  return ms > 0 ? Math.ceil(ms / 60000) : 0;
}

// Counts one event for the key; blocks it when the limit is reached.
export async function recordAttempt(DB: D1Database, key: string, limit: Limit, now = new Date()): Promise<void> {
  const row = await DB.prepare("select count, window_start from auth_attempts where key = ?1").bind(key).first<{ count: number; window_start: string }>();
  const windowOpen = row && now.getTime() - fromSql(row.window_start).getTime() < limit.windowMinutes * 60000;
  const count = windowOpen ? Number(row!.count) + 1 : 1;
  const start = windowOpen ? row!.window_start : sqlTime(now);
  const blocked = count >= limit.max ? sqlTime(new Date(now.getTime() + limit.blockMinutes * 60000)) : null;
  await DB.prepare(
    `insert into auth_attempts (key, count, window_start, blocked_until) values (?1, ?2, ?3, ?4)
     on conflict(key) do update set count = excluded.count, window_start = excluded.window_start,
       blocked_until = coalesce(excluded.blocked_until, case when auth_attempts.blocked_until > ?5 then auth_attempts.blocked_until end)`
  ).bind(key, count, start, blocked, sqlTime(now)).run();
}

export async function clearAttempts(DB: D1Database, key: string): Promise<void> {
  await DB.prepare("delete from auth_attempts where key = ?1").bind(key).run();
}

// Old rows are useless after a day.
export async function pruneAttempts(DB: D1Database, now = new Date()): Promise<void> {
  await DB.prepare("delete from auth_attempts where window_start < ?1 and (blocked_until is null or blocked_until < ?1)")
    .bind(sqlTime(new Date(now.getTime() - 86400000))).run();
}
