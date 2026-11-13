import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { HTTPException } from "hono/http-exception";
import { openApiSpec } from "./openapi";
import { authRoutes } from "./routes/auth";
import { vehiclesRoutes } from "./routes/vehicles";
import { catalogRoutes } from "./routes/catalog";
import { searchRoutes } from "./routes/search";
import { storefrontSellersRoutes } from "./routes/storefront.sellers";
import { marketplaceRoutes } from "./routes/marketplace";
import { marketplaceAnalyticsRoutes } from "./routes/marketplace.analytics";
import { marketplacePartsRoutes } from "./routes/marketplace.parts";
import { mediaRoutes } from "./routes/media";
import { commerceRoutes } from "./routes/commerce";
import { adminRoutes } from "./routes/admin";
import { adminAnalyticsRoutes } from "./routes/admin.analytics";
import { checkDatabase, healthRoutes } from "./routes/health";
import type { Env } from "./types";
import { whatsappRoutes } from "./routes/whatsapp";
import { requestsRoutes } from "./routes/requests";
import { stockAlertsRoutes } from "./routes/stock-alerts";
import { carriersRoutes } from "./routes/carriers";
import { allowedOrigin } from "./utils/cors";

const app = new Hono();

app.use(
  "*",
  cors({
    // Our own sites only (utils/cors.ts).
    origin: (origin, c) => allowedOrigin(origin, (c.env || {}) as Record<string, string>),
    maxAge: 86400,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-PartHub-Lang", "Idempotency-Key"],
  })
);

// Security headers on every API response (the three sites set theirs in
// _headers). Part photos are served from this domain and shown on the
// sites: Cross-Origin-Resource-Policy must allow other origins.
app.use(
  "*",
  secureHeaders({
    strictTransportSecurity: "max-age=31536000; includeSubDomains",
    xFrameOptions: "DENY",
    xContentTypeOptions: "nosniff",
    referrerPolicy: "strict-origin-when-cross-origin",
    crossOriginResourcePolicy: "cross-origin",
    crossOriginOpenerPolicy: "same-origin",
    crossOriginEmbedderPolicy: false,
    originAgentCluster: "?1",
    xDnsPrefetchControl: "off",
    xDownloadOptions: "noopen",
    xPermittedCrossDomainPolicies: "none",
    xXssProtection: "0",
  })
);

app.get("/health", async (c) => {
  const db = await checkDatabase(c.env as Env);
  return c.json({ ok: db.ok, service: "parthub-api", database: db.ok ? "ok" : "down" }, db.ok ? 200 : 503);
});

// One envelope for every JSON answer (apps rely on it, see openapi.ts):
// older routes answer { ok, … }, newer ones { success, … }; each answer now
// carries both, same value. Additive: nothing the sites read changes.
app.use("*", async (c, next) => {
  await next();
  if (!(c.res.headers.get("content-type") || "").includes("application/json")) return;
  let body: unknown;
  try {
    body = await c.res.clone().json();
  } catch {
    return;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return;
  const b = body as Record<string, unknown>;
  const s = typeof b.success === "boolean";
  const o = typeof b.ok === "boolean";
  if (s === o) return; // both already, or neither (not an API envelope)
  const flag = s ? b.success : b.ok;
  const headers = new Headers(c.res.headers);
  headers.delete("content-length");
  c.res = new Response(JSON.stringify({ success: flag, ok: flag, ...b }), { status: c.res.status, headers });
});

app.route("/api/v1/health", healthRoutes);
// The apps' contract (src/openapi.ts).
app.get("/api/v1/openapi.json", (c) => {
  c.header("Cache-Control", "public, max-age=300");
  return c.json(openApiSpec());
});
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/vehicles", vehiclesRoutes);
app.route("/api/v1/catalog", catalogRoutes);
app.route("/api/v1/search", searchRoutes);
app.route("/api/v1/storefront/sellers", storefrontSellersRoutes);
app.route("/api/v1/catalog/parts", marketplacePartsRoutes);
app.route("/api/v1/marketplace", marketplaceRoutes);
app.route("/api/v1/marketplace", marketplaceAnalyticsRoutes);
app.route("/api/v1/media", mediaRoutes);
app.route("/api/v1/commerce", commerceRoutes);
app.route("/api/v1/admin", adminRoutes);
app.route("/api/v1/admin/analytics", adminAnalyticsRoutes);
app.route("/api/v1/whatsapp", whatsappRoutes);
app.route("/api/v1/requests", requestsRoutes);
app.route("/api/v1/stock-alerts", stockAlertsRoutes);
app.route("/api/v1/carriers", carriersRoutes);

// Every unexpected error: JSON (the sites and apps read it), a short id to
// find it in the Worker logs, never the internals. A body that is not
// JSON is the client's mistake (400), not ours.
app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  const requestId = (c.req.header("cf-ray") || crypto.randomUUID()).split("-")[0]!.slice(0, 16);
  c.header("X-Request-Id", requestId);
  if (err instanceof SyntaxError && /JSON/i.test(err.message)) {
    return c.json({ success: false, error: "The request body must be valid JSON", request_id: requestId }, 400);
  }
  console.error(`[error] ${requestId} ${c.req.method} ${new URL(c.req.url).pathname}: ${err instanceof Error ? err.stack || err.message : String(err)}`);
  return c.json({ success: false, error: "Something went wrong. Please try again.", request_id: requestId }, 500);
});

app.notFound((c) => {
  return c.json(
    {
      ok: false,
      error: "Route not found",
    },
    404
  );
});

export default app;

