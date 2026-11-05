import { useT } from "../../i18n";

// One stock indicator for every place a part is shown.
export const LOW_STOCK_THRESHOLD = 3;

export function stockLevel(quantity) {
  const qty = Number(quantity || 0);
  if (qty <= 0) return "out";
  if (qty <= LOW_STOCK_THRESHOLD) return "low";
  return "in";
}

const TONES = {
  in: "border-emerald-400/30 bg-emerald-400/10 text-emerald-800",
  low: "border-amber-400/40 bg-amber-400/10 text-amber-800",
  out: "border-red-400/30 bg-red-400/10 text-red-800",
};

export default function StockBadge({ quantity, size = "sm", className = "" }) {
  const t = useT();
  const level = stockLevel(quantity);
  const qty = Number(quantity || 0);
  const label =
    level === "out"
      ? t("Out of stock")
      : level === "low"
        ? qty === 1
          ? t("Only 1 left")
          : t("Only {n} left", { n: qty })
        : t("In stock");
  return (
    <span
      className={[
        "inline-flex w-fit items-center gap-1.5 rounded-full border font-semibold before:h-1.5 before:w-1.5 before:flex-none before:rounded-full before:bg-current",
        size === "lg" ? "h-8 px-3 text-sm" : "h-6 px-2.5 text-xs",
        TONES[level],
        className,
      ].join(" ")}
    >
      {label}
    </span>
  );
}
