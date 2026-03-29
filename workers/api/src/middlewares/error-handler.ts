import type { ErrorHandler } from "hono";
import type { Env, HonoVariables } from "../types";

export const errorHandler: ErrorHandler<{
  Bindings: Env;
  Variables: HonoVariables;
}> = (err, c) => {
  const reqId = c.get("request_id") ?? "–";
  console.error(`[${reqId}] Unhandled error:`, err.message);

  if (err.message === "Unauthorized") {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  if (err.message === "Forbidden") {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  if (err.message === "Not Found") {
    return c.json({ success: false, error: "Not found" }, 404);
  }

  return c.json(
    {
      success: false,
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Internal server error",
    },
    500
  );
};
