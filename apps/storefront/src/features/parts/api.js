import { api } from "../../lib/api";

export const partsApi = {
  list: (filters = {}) => {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== "")
    ).toString();
    return api.get(`/api/v1/catalog/parts${params ? `?${params}` : ""}`);
  },

  getBySlug: (slug) => api.get(`/api/v1/catalog/parts/${slug}`),

  getSimilar: (slug) => api.get(`/api/v1/catalog/parts/${slug}/similar`),

  getReviews: (partId) => api.get(`/api/v1/catalog/parts/${partId}/reviews`),

  getCategories: () => api.get("/api/v1/catalog/categories"),

  getBrands: () => api.get("/api/v1/catalog/brands"),
};
