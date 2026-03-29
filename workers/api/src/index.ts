import { Hono } from "hono";
import type { Env, HonoVariables } from "./types";
import { app } from "./app";

export default {
  fetch: app.fetch,
};
