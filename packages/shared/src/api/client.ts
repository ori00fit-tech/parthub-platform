import type { ApiResponse, ApiError } from "../types/api";

interface ClientOptions {
  baseUrl: string;
  getToken: () => string | null;
  onUnauthorized?: () => void;
  // Turns an English API/client error message into the user's language.
  translateError?: (message: string) => string;
  // The interface language ("ar" | "fr" | "en"), sent with signed-in calls:
  // PartHub's WhatsApp messages to the person use it.
  getLanguage?: () => string;
}

type LegacyApiResponse<T> = {
  success?: boolean;
  ok?: boolean;
  data?: T;
  meta?: unknown;
  message?: string;
  error?: string | { code?: string; message?: string };
};

function extractErrorMessage(body: unknown): string {
  if (!body || typeof body !== "object") return "Request failed";

  const b = body as Record<string, unknown>;
  const err = b.error;

  if (typeof err === "string" && err.trim()) return err;

  if (err && typeof err === "object") {
    const msg = (err as Record<string, unknown>).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }

  const msg = b.message;
  if (typeof msg === "string" && msg.trim()) return msg;

  return "Request failed";
}

function isSuccessful(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return b.success === true || b.ok === true;
}

export function createApiClient(options: ClientOptions) {
  const { baseUrl, getToken, onUnauthorized, translateError, getLanguage } = options;
  const fail = (message: string) => new Error(translateError ? translateError(message) : message);

  async function request<T>(
    path: string,
    init: RequestInit = {}
  ): Promise<ApiResponse<T> | LegacyApiResponse<T>> {
    const token = getToken();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(token && getLanguage ? { "X-PartHub-Lang": getLanguage() } : {}),
      ...init.headers,
    };

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers,
      });
    } catch {
      // Network failure (offline, DNS, CORS): browser messages vary, so use one.
      throw fail("Failed to fetch");
    }

    let body: unknown = null;
    let parsed = true;
    try {
      body = await response.json();
    } catch {
      parsed = false;
    }

    if (response.status === 401) {
      // Only an expired/invalid session should sign the user out. A failed
      // sign-in (no token sent) keeps the server's message, e.g.
      // "Invalid credentials".
      if (token) onUnauthorized?.();
      throw fail(parsed ? extractErrorMessage(body) : "Unauthorized");
    }

    if (!parsed) throw fail("Invalid JSON response");

    if (!response.ok || !isSuccessful(body)) {
      throw fail(extractErrorMessage(body));
    }

    return body as ApiResponse<T> | LegacyApiResponse<T>;
  }

  return {
    get: <T>(path: string) => request<T>(path, { method: "GET" }),
    post: <T>(path: string, data?: unknown) =>
      request<T>(path, { method: "POST", body: JSON.stringify(data) }),
    put: <T>(path: string, data?: unknown) =>
      request<T>(path, { method: "PUT", body: JSON.stringify(data) }),
    patch: <T>(path: string, data?: unknown) =>
      request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
    delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  };
}
