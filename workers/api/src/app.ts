import { Hono } from "hono";
import type { Env, HonoVariables } from "./types";

import { corsMiddleware } from "./middlewares/cors";
import { loggingMiddleware } from "./middlewares/logging";
import { errorHandler } from "./middlewares/error-handler";
import { requestIdMiddleware } from "./middlewares/request-id";

import { authRoutes } from "./routes/auth";
import { catalogRoutes } from "./routes/catalog";
import { marketplaceRoutes } from "./routes/marketplace";
import { commerceRoutes } from "./routes/commerce";
import { adminRoutes } from "./routes/admin";
import { mediaRoutes } from "./routes/media";
import { whatsappRoutes } from "./routes/whatsapp";
import { healthRoutes } from "./routes/health";
import vehiclesRoutes from "./routes/vehicles";

export const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

app.use("*", requestIdMiddleware);
app.use("*", corsMiddleware);
app.use("*", loggingMiddleware);
app.onError(errorHandler);

app.route("/health", healthRoutes);
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/catalog", catalogRoutes);
app.route("/api/v1/marketplace", marketplaceRoutes);
app.route("/api/v1/commerce", commerceRoutes);
app.route("/api/v1/admin", adminRoutes);
app.route("/api/v1/media", mediaRoutes);
app.route("/api/v1/whatsapp", whatsappRoutes);
app.route("/api/v1/vehicles", vehiclesRoutes);

app.notFound((c) =>
  c.json({ success: false, error: "Route not found" }, 404)
);

export default app;
