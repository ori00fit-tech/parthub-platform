import { Link } from "react-router-dom";
import { useCart } from "../../../features/cart/CartContext";
import { formatPrice } from "../../../lib/formatters";

const DEFAULT_IMG = "/placeholder-part.webp";

export default function PartCard({ part }) {
  const { addItem } = useCart();

  const discount =
    part.compare_price && part.compare_price > part.price
      ? Math.round(((part.compare_price - part.price) / part.compare_price) * 100)
      : null;

  return (
    <div className="group bg-surface border border-line rounded-xl overflow-hidden hover:shadow-md hover:border-navy transition flex flex-col">
      <Link to={`/parts/${part.slug}`} className="block relative aspect-square bg-surface-2 overflow-hidden">
        <img
          src={part.thumbnail ?? DEFAULT_IMG}
          alt={part.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {discount && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
            -{discount}%
          </span>
        )}
        <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded font-medium ${
          part.condition === "new"
            ? "bg-emerald-400/15 text-emerald-700"
            : part.condition === "used"
            ? "bg-amber-400/15 text-amber-700"
            : "bg-navy/10 text-link"
        }`}>
          {part.condition}
        </span>
      </Link>

      <div className="p-3 flex flex-col flex-1">
        <Link to={`/parts/${part.slug}`} className="text-sm font-medium text-ink-2 hover:text-blue-800 line-clamp-2 mb-1">
          {part.title}
        </Link>

        <p className="text-xs text-faint mb-2">{part.seller_name}</p>

        {part.rating_count > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <span className="text-yellow-400 text-xs">★</span>
            <span className="text-xs text-muted">{part.avg_rating}</span>
            <span className="text-xs text-faint">({part.rating_count})</span>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2">
          <div>
            <span className="text-base font-bold text-ink">
              {formatPrice(part.price)}
            </span>
            {part.compare_price && (
              <span className="text-xs text-faint line-through ml-1">
                {formatPrice(part.compare_price)}
              </span>
            )}
          </div>
          <button
            onClick={() => addItem(part)}
            className="text-xs bg-navy text-white px-3 py-1.5 rounded-lg hover:bg-navy-deep transition shrink-0"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
