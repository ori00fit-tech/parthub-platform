import type { Context } from "hono";

export function ok<T>(c: Context, data: T, status = 200) {
  return c.json({ success: true, data }, status as 200);
}

export function created<T>(c: Context, data: T) {
  return c.json({ success: true, data }, 201);
}

export function paginated<T>(
  c: Context,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  }
) {
  const total_pages = Math.ceil(pagination.total / pagination.limit);
  return c.json({
    success: true,
    data,
    pagination: {
      ...pagination,
      total_pages,
      has_next: pagination.page < total_pages,
      has_prev: pagination.page > 1,
    },
  });
}

export function fail(c: Context, error: string, status = 400) {
  return c.json({ success: false, error }, status as 400);
}

export function notFound(c: Context, resource = "Resource") {
  return c.json({ success: false, error: `${resource} not found` }, 404);
}

// A 500's message for the client: never the database's own text (table
// and column names); that goes to the Worker logs.
export function internalError(error: unknown): string {
  console.error(`[error] ${error instanceof Error ? error.stack || error.message : String(error)}`);
  return "Something went wrong. Please try again.";
}
