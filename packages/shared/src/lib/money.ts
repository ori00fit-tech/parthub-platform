// ============================================================
// Money — PartHub sells in Moroccan dirhams (MAD).
//
// Amounts are stored and sent by the API as integer centimes
// (1 MAD = 100 centimes), the same way for parts, orders and offers.
// Use these helpers for every price shown or typed in any app.
// ============================================================

export const CURRENCY = "MAD";
export const LOCALE = "fr-MA";

const formatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wholeFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

/** 65000 → "650,00 MAD". `null`/`undefined` → "—". */
export function formatMoney(centimes: number | string | null | undefined, options: { whole?: boolean } = {}): string {
  if (centimes === null || centimes === undefined || centimes === "") return "—";
  const value = Number(centimes);
  if (!Number.isFinite(value)) return "—";
  return (options.whole ? wholeFormatter : formatter).format(value / 100);
}

/**
 * Parse what a person typed in dirhams into centimes.
 * Accepts "650", "650.5", "650,50", "1 250,00", "1,250.00".
 * Returns null for empty input and NaN for anything that isn't an amount.
 */
export function parseMoneyInput(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  let text = String(input).trim().replace(/\s| | /g, "").replace(/mad|dh|dhs/gi, "");
  if (!text) return null;

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // Both present: the later one is the decimal separator.
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    text = text.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma > -1) {
    // "1,250" (thousands) vs "650,5" (decimal): 3 digits after → thousands.
    text = /,\d{3}$/.test(text) && text.indexOf(",") === lastComma ? text.replace(",", "") : text.replace(",", ".");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(text)) return Number.NaN;
  return Math.round(Number(text) * 100);
}

/** Centimes → plain dirham string for an input field: 65050 → "650.50", 65000 → "650". */
export function centimesToInput(centimes: number | string | null | undefined): string {
  if (centimes === null || centimes === undefined || centimes === "") return "";
  const value = Number(centimes);
  if (!Number.isFinite(value)) return "";
  return value % 100 === 0 ? String(value / 100) : (value / 100).toFixed(2);
}
