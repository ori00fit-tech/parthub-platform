import { apiGet, apiPost } from "../../lib/api";

export const requestsApi = {
  create: (payload) => apiPost("/api/v1/requests", payload, { auth: true }),
  listMine: () => apiGet("/api/v1/requests/mine", undefined, { auth: true }),
  getMine: (id) => apiGet(`/api/v1/requests/mine/${id}`, undefined, { auth: true }),
  accept: (id, offerId) => apiPost(`/api/v1/requests/mine/${id}/accept/${offerId}`, {}, { auth: true }),
  close: (id) => apiPost(`/api/v1/requests/mine/${id}/close`, {}, { auth: true }),
};

export function formatMAD(cents) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 2,
  }).format(Number(cents) / 100);
}

export function requestStatus(request) {
  if (!request) return { label: "", className: "" };
  if (request.status === "fulfilled") {
    return { label: "Offer accepted", className: "bg-emerald-50 text-emerald-700" };
  }
  if (request.status === "closed") return { label: "Closed", className: "bg-gray-100 text-gray-600" };
  if (Number(request.is_expired)) return { label: "Expired", className: "bg-amber-50 text-amber-700" };
  return { label: "Open", className: "bg-blue-50 text-blue-700" };
}

export const CONDITION_LABELS = {
  any: "New or used",
  new: "New",
  used: "Used",
  refurbished: "Refurbished",
};

// wa.me needs international digits only (e.g. 2126XXXXXXXX).
export function whatsappLink(phone, text) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `212${digits.slice(1)}`; // Moroccan local format
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
