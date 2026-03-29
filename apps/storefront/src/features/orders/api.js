import { api } from "../../lib/api";

export const ordersApi = {
  create: (payload) => api.post("/api/v1/commerce/orders", payload),
  list: () => api.get("/api/v1/commerce/orders"),
  getByRef: (ref) => api.get(`/api/v1/commerce/orders/${ref}`),
  submitReview: (payload) => api.post("/api/v1/commerce/reviews", payload),
};
