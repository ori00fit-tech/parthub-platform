import { apiGet } from "../lib/api.js";

export async function fetchParts() {
  const res = await apiGet("/api/v1/catalog/parts");
  return res.data || res.result || [];
}

export async function fetchPartBySlug(slug) {
  const res = await apiGet(`/api/v1/catalog/parts/${slug}`);
  return res.data || res.result;
}
