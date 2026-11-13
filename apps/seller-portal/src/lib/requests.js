import { mediaSrc } from "@parthub/shared";
import { t } from "../i18n";

// Uploaded media is served by the API (/api/v1/media/...).
// width: the largest size the page shows (a smaller copy when resizing is on).
export function mediaUrl(path, width) {
  return mediaSrc(path, width);
}

export { formatMoney as formatMAD } from "@parthub/shared";

export function offerBadge(status) {
  switch (status) {
    case "pending":
      return { label: t("Offer sent"), className: "bg-amber-50 text-amber-700" };
    case "accepted":
      return { label: t("Accepted"), className: "bg-emerald-50 text-emerald-700" };
    case "rejected":
      return { label: t("Not selected"), className: "bg-gray-100 text-gray-600" };
    case "withdrawn":
      return { label: t("Withdrawn"), className: "bg-gray-100 text-gray-600" };
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
