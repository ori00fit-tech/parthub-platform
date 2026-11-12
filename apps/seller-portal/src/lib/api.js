import { currentLanguage, serverMessage } from "../i18n";
import { createApiClient, SELLER_TOKEN_KEY } from "@parthub/shared";

export const BASE_URL =
  import.meta.env.VITE_SELLER_API_BASE_URL ||
  "https://api.parthub.autos";

export const api = createApiClient({
  baseUrl: BASE_URL,
  translateError: serverMessage,
  getLanguage: currentLanguage,
  getToken: () => localStorage.getItem(SELLER_TOKEN_KEY),
  onUnauthorized: () => {
    localStorage.removeItem(SELLER_TOKEN_KEY);
    window.location.href = "/auth";
  },
});
