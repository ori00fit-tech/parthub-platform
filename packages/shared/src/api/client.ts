import type { ApiResponse, ApiError } from "../types/api";

interface ClientOptions {
  baseUrl: string;
  getToken: () => string | null;
  onUnauthorized?: () => void;
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
  const { baseUrl, getToken, onUnauthorized } = options;

  async function request<T>(
    path: string,
    init: RequestInit = {}
  ): Promise<ApiResponse<T> | LegacyApiResponse<T>> {
    const token = getToken();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    };

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (response.status === 401) {
      onUnauthorized?.();
      throw new Error("Unauthorized");
    }

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      throw new Error("Invalid JSON response");
    }

    if (!response.ok || !isSuccessful(body)) {
      throw new Error(extractErrorMessage(body));
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
