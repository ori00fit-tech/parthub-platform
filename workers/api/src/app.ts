import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth";
import { vehiclesRoutes } from "./routes/vehicles";
import { catalogRoutes } from "./routes/catalog";
import { searchRoutes } from "./routes/search";
import { marketplaceRoutes } from "./routes/marketplace";
import { marketplacePartsRoutes } from "./routes/marketplace.parts";
import { mediaRoutes } from "./routes/media";
import { commerceRoutes } from "./routes/commerce";
import { adminRoutes } from "./routes/admin";
import { healthRoutes } from "./routes/health";
import { whatsappRoutes } from "./routes/whatsapp";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/health", (c) => {
  return c.json({
    ok: true,
    service: "parthub-api",
  });
});

app.route("/api/v1/health", healthRoutes);
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/vehicles", vehiclesRoutes);
app.route("/api/v1/catalog", catalogRoutes);
app.route("/api/v1/search", searchRoutes);
app.route("/api/v1/catalog/parts", marketplacePartsRoutes);
app.route("/api/v1/marketplace", marketplaceRoutes);
app.route("/api/v1/media", mediaRoutes);
app.route("/api/v1/commerce", commerceRoutes);
app.route("/api/v1/admin", adminRoutes);
app.route("/api/v1/whatsapp", whatsappRoutes);

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
