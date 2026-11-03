import { apiGet, apiPost } from "../../lib/api";

export const requestsApi = {
  create: (payload) => apiPost("/api/v1/requests", payload, { auth: true }),
  listMine: () => apiGet("/api/v1/requests/mine", undefined, { auth: true }),
  getMine: (id) => apiGet(`/api/v1/requests/mine/${id}`, undefined, { auth: true }),
  accept: (id, offerId) => apiPost(`/api/v1/requests/mine/${id}/accept/${offerId}`, {}, { auth: true }),
  close: (id) => apiPost(`/api/v1/requests/mine/${id}/close`, {}, { auth: true }),
};

// Offers are priced in centimes (MAD).
export { formatMoney as formatMAD } from "@parthub/shared";

export function requestStatus(request) {
  if (!request) return { label: "", className: "" };
  if (request.status === "fulfilled") {
    return { label: "Offer accepted", className: "bg-emerald-400/10 text-emerald-300" };
  }
  if (request.status === "closed") return { label: "Closed", className: "bg-surface-2 text-muted" };
  if (Number(request.is_expired)) return { label: "Expired", className: "bg-amber-400/10 text-amber-300" };
  return { label: "Open", className: "bg-navy/20 text-link" };
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
