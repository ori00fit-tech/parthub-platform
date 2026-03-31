import { Hono } from "hono";
import { cors } from "hono/cors";
import { vehiclesRoutes } from "./routes/vehicles";
import { catalogRoutes } from "./routes/catalog";

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

app.route("/api/v1/vehicles", vehiclesRoutes);
app.route("/api/v1/catalog", catalogRoutes);

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
