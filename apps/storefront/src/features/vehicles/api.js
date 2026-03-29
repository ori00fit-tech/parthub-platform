import { api } from "../../lib/api";

export const vehiclesApi = {
  getMakes: () => api.get("/api/v1/catalog/vehicles/makes"),
  getModels: (makeId) => api.get(`/api/v1/catalog/vehicles/models?make_id=${makeId}`),
  getYears: (modelId) => api.get(`/api/v1/catalog/vehicles/years?model_id=${modelId}`),
};
