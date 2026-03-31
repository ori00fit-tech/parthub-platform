import { Hono } from "hono";
import { vehiclesRoutes } from "./routes/vehicles";
import { catalogRoutes } from "./routes/catalog";

const app = new Hono();

app.route("/api/v1/vehicles", vehiclesRoutes);
app.route("/api/v1/catalog", catalogRoutes);

export default app;
