import { Icon } from "@parthub/shared/icons";
import { useT } from "../../i18n";

// One stock indicator for every place a part is shown.
export const LOW_STOCK_THRESHOLD = 3;

export function stockLevel(quantity) {
  const qty = Number(quantity || 0);
  if (qty <= 0) return "out";
  if (qty <= LOW_STOCK_THRESHOLD) return "low";
  return "in";
}

const ICON = { in: "in-stock", low: "low-stock", out: "out-of-stock" };

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
        "inline-flex w-fit items-center gap-1 rounded-full border font-semibold",
        size === "lg" ? "h-8 px-3 text-sm" : "h-6 px-2.5 text-xs",
        TONES[level],
        className,
      ].join(" ")}
    >
      <Icon name={ICON[level]} className={size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"} strokeWidth={2.25} />
      {label}
    </span>
  );
}
