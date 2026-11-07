// Delivery fees per seller and shipments (migrations/0022).
// Each seller charges their own fee: one price in their city, one for the
// rest of Morocco (NULL = the platform's flat fee). The buyer pays each
// seller their parts + that seller's fee, cash on delivery. When the seller
// ships, they record the carrier and the tracking number (no carrier API
// yet: see infra/docs/shipping.md).

export const CARRIERS = ["amana", "ctm", "sendit", "forcelog", "olivraison", "own", "other"] as const;
export type Carrier = (typeof CARRIERS)[number];

// Same spelling for "Casa", "Casablanca", "الدار البيضاء"...
const CITY_ALIASES: Record<string, string[]> = {
  casablanca: ["casa", "dar el beida", "dar beida", "الدار البيضاء", "الدارالبيضاء", "كازا"],
  rabat: ["الرباط"],
  sale: ["salé", "سلا"],
  temara: ["تمارة"],
  kenitra: ["القنيطرة"],
  mohammedia: ["المحمدية"],
  "el jadida": ["eljadida", "الجديدة"],
  marrakech: ["marrakesh", "مراكش"],
  fes: ["fès", "fez", "فاس"],
  meknes: ["meknès", "مكناس"],
  tanger: ["tangier", "tangiers", "طنجة"],
  tetouan: ["tétouan", "تطوان"],
  agadir: ["أكادير", "اكادير"],
  oujda: ["وجدة"],
  nador: ["الناظور"],
  safi: ["آسفي", "اسفي"],
  "beni mellal": ["بني ملال"],
  khouribga: ["خريبكة"],
  settat: ["سطات"],
  laayoune: ["laâyoune", "العيون"],
};

function fold(s: string): string {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[-_.]+/g, " ").replace(/\s+/g, " ").trim();
}

// "Casablanca, Hay Hassani" / "casa" / "الدار البيضاء" → "casablanca".
export function cityKey(value: string | null | undefined): string {
  const first = fold(String(value || "").split(/[,،(/]/)[0] || "");
  if (!first) return "";
  for (const [key, aliases] of Object.entries(CITY_ALIASES)) {
    if (first === key || aliases.some((a) => fold(a) === first)) return key;
  }
  return first;
}

export function sameCity(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = cityKey(a);
  return Boolean(x) && x === cityKey(b);
}

export type SellerFees = { location: string | null; delivery_fee_local: number | null; delivery_fee_national: number | null };

// The seller's fee for a buyer in buyerCity. Unknown city → the national fee.
export function deliveryFee(seller: SellerFees, buyerCity: string | null | undefined, platformFee: number): number {
  const local = seller.delivery_fee_local ?? platformFee;
  const national = seller.delivery_fee_national ?? platformFee;
  return sameCity(seller.location, buyerCity) ? Number(local) : Number(national);
}

// Reads a fee in MAD from settings ("25", "25,50", "") → centimes or null.
export function readFeeMad(value: unknown): number | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 0 || n > 2000) return "invalid";
  return Math.round(n * 100);
}

export function cleanCarrier(value: unknown): Carrier | null {
  const v = String(value || "").trim().toLowerCase();
  return (CARRIERS as readonly string[]).includes(v) ? (v as Carrier) : null;
}

export function cleanTracking(value: unknown): string | null {
  const v = String(value || "").trim().replace(/\s+/g, " ").slice(0, 60);
  return v || null;
}
