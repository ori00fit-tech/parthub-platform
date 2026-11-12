// Price, compare-at price, stock and weight of a part, as the API accepts
// them (POST/PUT /parts and /me/parts). The seller portal checks the same
// in the browser, but the API must not trust it: a negative or zero price
// or stock would reach orders and totals. Money is in centimes (integers).

export const MAX_PRICE_CENTIMES = 100_000_000; // 1,000,000 MAD, as the CSV import
export const MAX_QUANTITY = 100_000;
export const MAX_WEIGHT_KG = 2_000;

type Raw = { price?: unknown; compare_price?: unknown; quantity?: unknown; weight_kg?: unknown };
export type PartValues = { price: number; compare_price: number | null; quantity: number; weight_kg: number | null };

const empty = (v: unknown) => v === undefined || v === null || v === "";

export function readPartValues(raw: Raw): { ok: true; values: PartValues } | { ok: false; code: string; error: string } {
  const price = Number(raw.price);
  if (empty(raw.price) || !Number.isInteger(price) || price <= 0 || price > MAX_PRICE_CENTIMES) {
    return { ok: false, code: "PRICE_REQUIRED", error: "price must be a whole number of centimes, more than 0 and at most 100000000" };
  }
  let compare: number | null = null;
  if (!empty(raw.compare_price)) {
    compare = Number(raw.compare_price);
    if (!Number.isInteger(compare) || compare < 0 || compare > MAX_PRICE_CENTIMES) {
      return { ok: false, code: "INVALID_COMPARE_PRICE", error: "compare_price must be a whole number of centimes (0 to 100000000)" };
    }
  }
  let quantity = 1;
  if (!empty(raw.quantity)) {
    quantity = Number(raw.quantity);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QUANTITY) {
      return { ok: false, code: "INVALID_QUANTITY", error: "quantity must be a whole number from 0 to 100000" };
    }
  }
  let weight: number | null = null;
  if (!empty(raw.weight_kg)) {
    weight = Number(raw.weight_kg);
    if (!Number.isFinite(weight) || weight <= 0 || weight > MAX_WEIGHT_KG) {
      return { ok: false, code: "INVALID_WEIGHT", error: "weight_kg must be more than 0 and at most 2000" };
    }
  }
  return { ok: true, values: { price, compare_price: compare, quantity, weight_kg: weight } };
}
