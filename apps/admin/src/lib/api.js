import { createApiClient } from "@parthub/shared";
import { ADMIN_TOKEN_KEY } from "@parthub/shared";

const BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL ?? "http://localhost:8787";

export const api = createApiClient({
  baseUrl: BASE_URL,
  getToken: () => localStorage.getItem(ADMIN_TOKEN_KEY),
  onUnauthorized: () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    window.location.href = "/auth";
  },
});
