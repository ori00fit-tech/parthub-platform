import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
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
    allowHeaders: ["Content-Type", "Authorization"],
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

app.route("/api/v1/health", healthRoutes);
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

