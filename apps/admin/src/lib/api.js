import { serverMessage } from "../i18n";
import { createApiClient, ADMIN_TOKEN_KEY } from "@parthub/shared";

export const BASE_URL =
  import.meta.env.VITE_ADMIN_API_BASE_URL ||
  "https://api.parthub.autos";

export const api = createApiClient({
  baseUrl: BASE_URL,
  translateError: serverMessage,
  getToken: () => localStorage.getItem(ADMIN_TOKEN_KEY),
  onUnauthorized: () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    window.location.href = "/auth";
  },
});
