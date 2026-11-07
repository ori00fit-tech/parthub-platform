import app from "./app";
import type { Env } from "./types";
import { accrueCommissions } from "./utils/commissions";

// fetch: the API. scheduled: daily jobs (wrangler.toml [triggers]).
export default {
  fetch: app.fetch,
  // Records the commission of sales whose returns window ended, so the
  // ledger never depends on someone opening a page (same rows either way).
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        for (let pass = 0; pass < 20; pass++) {
          if ((await accrueCommissions(env.DB)) < 500) break;
        }
      })()
    );
  },
};
