import type { D1Database, R2Bucket, KVNamespace } from "@cloudflare/workers-types";

// Cloudflare Worker bindings
export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  KV: KVNamespace;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  APP_ENV: string;
  WHATSAPP_ACCESS_TOKEN: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
}

// Hono context variables
export interface HonoVariables {
  user_id: number;
  user_role: "buyer" | "seller" | "admin";
  seller_id: number | null;
  request_id: string;
}
