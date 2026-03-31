const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function buildUrl(path, params) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${BASE_URL}${normalizedPath}`);

  if (params && typeof params === "object") {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

async function parseJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function extractErrorMessage(data, fallback = "Something went wrong") {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data?.error?.message) return data.error.message;
  if (typeof data?.error === "string") return data.error;
  if (data?.message) return data.message;
  return fallback;
}

function getAuthToken() {
  try {
    return localStorage.getItem("parthub_buyer_token") || "";
  } catch {
    return "";
  }
}

async function request(path, options = {}) {
  const { method = "GET", body, params, headers = {}, auth = false } = options;

  const finalHeaders = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getAuthToken();
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const res = await fetch(buildUrl(path, params), {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(extractErrorMessage(data, "API request failed"));
  }

  return data;
}

export function apiGet(path, params, options = {}) {
  return request(path, { ...options, method: "GET", params });
}

export function apiPost(path, body, options = {}) {
  return request(path, { ...options, method: "POST", body });
}

export function apiPut(path, body, options = {}) {
  return request(path, { ...options, method: "PUT", body });
}

export function apiDelete(path, options = {}) {
  return request(path, { ...options, method: "DELETE" });
}
