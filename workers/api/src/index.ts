import app from "./app";
import type { Env } from "./types";
import { accrueCommissions } from "./utils/commissions";
import { notifyLateShipments } from "./utils/shipping-delays";

// fetch: the API. scheduled: daily jobs (wrangler.toml [triggers]).
export default {
  fetch: app.fetch,
  // Records the commission of sales whose returns window ended, so the
  // ledger never depends on someone opening a page (same rows either way),
  // and checks for late shipments.
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        for (let pass = 0; pass < 20; pass++) {
          if ((await accrueCommissions(env.DB)) < 500) break;
        }
      })()
    );
    // Shipped parcels with no news for days: buyer and seller are told.
    ctx.waitUntil(
      notifyLateShipments(env).catch((err) => console.warn(`[late shipments] ${err instanceof Error ? err.message : String(err)}`))
    );
  },
};
