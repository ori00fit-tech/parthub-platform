// ============================
// Base API Client
// ============================

import type { ApiResponse, ApiError } from "../types/api";

interface ClientOptions {
  baseUrl: string;
  getToken: () => string | null;
  onUnauthorized?: () => void;
}

export function createApiClient(options: ClientOptions) {
  const { baseUrl, getToken, onUnauthorized } = options;

  async function request<T>(
    path: string,
    init: RequestInit = {}
  ): Promise<ApiResponse<T>> {
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

    const body = (await response.json()) as ApiResponse<T> | ApiError;

    if (!response.ok || !body.success) {
      const err = body as ApiError;
      throw new Error(err.error ?? "Request failed");
    }

    return body as ApiResponse<T>;
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
