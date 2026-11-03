import { BASE_URL } from "./api";

// Uploaded media is served by the API (/api/v1/media/...).
export function mediaUrl(path) {
  if (!path) return "";
  return path.startsWith("/") ? `${BASE_URL}${path}` : path;
}

export function formatMAD(cents) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 2,
  }).format(Number(cents) / 100);
}

export function offerBadge(status) {
  switch (status) {
    case "pending":
      return { label: "Offer sent", className: "bg-amber-50 text-amber-700" };
    case "accepted":
      return { label: "Accepted 🎉", className: "bg-emerald-50 text-emerald-700" };
    case "rejected":
      return { label: "Not selected", className: "bg-gray-100 text-gray-600" };
    case "withdrawn":
      return { label: "Withdrawn", className: "bg-gray-100 text-gray-600" };
    default:
      return null;
  }
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
