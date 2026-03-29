// ============================
// @parthub/utils
// ============================

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateSku(prefix: string, id: number): string {
  return `${prefix.toUpperCase()}-${String(id).padStart(6, "0")}`;
}

export function generateOrderRef(id: number): string {
  return `PH-${new Date().getFullYear()}-${String(id).padStart(5, "0")}`;
}

// Money: stored as integer cents
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

// Arrays
export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = String(item[key]);
      acc[k] = acc[k] ?? [];
      acc[k]!.push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// Strings
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// Dates
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function nowIso(): string {
  return new Date().toISOString();
}

// Vehicles
export function vehicleLabel(
  make: string,
  model: string,
  year: number,
  engine?: string
): string {
  return [year, make, model, engine].filter(Boolean).join(" ");
}

export function parseYearRange(
  yearStart: number,
  yearEnd: number | null
): string {
  if (!yearEnd) return `${yearStart}+`;
  if (yearStart === yearEnd) return String(yearStart);
  return `${yearStart}–${yearEnd}`;
}
