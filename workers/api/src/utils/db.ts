import type { D1Database } from "@cloudflare/workers-types";

export async function dbFirst<T>(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<T | null> {
  const result = await db.prepare(query).bind(...params).first<T>();
  return result ?? null;
}

export async function dbAll<T>(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await db.prepare(query).bind(...params).all<T>();
  return result.results;
}

export async function dbRun(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<{ lastRowId: number | null; changes: number }> {
  const result = await db.prepare(query).bind(...params).run();
  return {
    lastRowId: result.meta.last_row_id ?? null,
    changes: result.meta.changes ?? 0,
  };
}

export async function dbCount(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<number> {
  const row = await db
    .prepare(query)
    .bind(...params)
    .first<{ total: number }>();
  return row?.total ?? 0;
}
