import { cors } from "hono/cors";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "https://parthub.site",
  "https://seller.parthub.site",
  "https://admin.parthub.site",
];

export const corsMiddleware = cors({
  origin: (origin) => {
    if (!origin) return "*";
    if (ALLOWED_ORIGINS.includes(origin)) return origin;
    if (origin.endsWith(".parthub.site")) return origin;
    return null;
  },
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  exposeHeaders: ["X-Request-ID"],
  maxAge: 86400,
  credentials: true,
});
