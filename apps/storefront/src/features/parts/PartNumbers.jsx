import { Link } from "react-router-dom";
import { Icon } from "@parthub/shared/icons";
import { formatPrice } from "../../lib/formatters";
import { mediaUrl } from "../../lib/media";
import { conditionLabel, useT } from "../../i18n";
import StockBadge from "../stock/StockBadge";

// The listing's part numbers (OEM / maker's), each a link to search by it.
export function PartNumbersList({ numbers = [] }) {
  const t = useT();
  if (!numbers.length) return null;
  const label = (n) =>
    n.kind === "oem"
      ? n.role === "replaces"
        ? t("Replaces original number")
        : t("Original (OEM) number")
      : n.brand_name
        ? t("{brand} number", { brand: n.brand_name })
        : t("Maker's number");
  return (
    <dl className="divide-y divide-line rounded-2xl border border-line">
      {numbers.map((n) => (
        <div key={`${n.id}-${n.role}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <dt className="text-sm text-muted">
            {label(n)}
            {n.role === "replaces" ? <span className="ms-1 text-xs text-faint">({t("according to the seller")})</span> : null}
          </dt>
          <dd>
            <Link to={`/parts?q=${encodeURIComponent(n.number)}`} dir="ltr" className="font-mono text-sm font-semibold text-link hover:underline">
              {n.number}
            </Link>
          </dd>
        </div>
      ))}
    </dl>
  );
}

// Other sellers' listings with the same (or a verified equivalent) number.
export function OtherOffers({ offers = [] }) {
  const t = useT();
  if (!offers.length) return null;
  return (
    <ul className="space-y-2">
      {offers.map((o) => (
        <li key={o.id}>
          <Link to={`/parts/${o.slug}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3 transition hover:border-line-strong">
            <div className="media-well flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-xl">
              {o.image_url ? <img src={mediaUrl(o.image_url, 160)} alt="" className="h-full w-full object-cover" /> : <Icon name="part" className="h-6 w-6 text-faint" />}
            </div>
            <div className="min-w-0 flex-1">
              <p dir="auto" className="line-clamp-1 text-sm font-semibold text-ink">{o.title}</p>
              <p className="text-xs text-muted">
                {[o.brand_name, conditionLabel(o.condition), o.seller_name, o.seller_location].filter(Boolean).join(" · ")}
              </p>
              {o.matched_number ? <p className="mt-0.5 font-mono text-[11px] text-faint" dir="ltr">{o.matched_number}</p> : null}
            </div>
            <div className="flex-none text-end">
              <p className="font-mono text-sm font-bold text-ink">{formatPrice(o.price)}</p>
              <div className="mt-1"><StockBadge quantity={o.quantity} /></div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
