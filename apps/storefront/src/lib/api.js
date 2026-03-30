const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function parseJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(data?.error?.message || data?.error || "API error");
  }

  return data;
}
