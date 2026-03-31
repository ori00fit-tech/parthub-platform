import { Hono } from "hono";
import { cors } from "hono/cors";

import { catalogRoutes } from "./routes/catalog";
import { vehiclesRoutes } from "./routes/vehicles";

const app = new Hono();

// ✅ PRODUCTION CORS FIX
app.use(
  "*",
  cors({
    origin: "*", // مؤقتاً نخليوها مفتوحة باش نحيدو المشكل
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// routes
app.route("/api/v1/catalog", catalogRoutes);
app.route("/api/v1/vehicles", vehiclesRoutes);

// health
app.get("/", (c) => {
  return c.json({ ok: true });
});

export default app;
