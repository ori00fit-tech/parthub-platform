import { Link } from "react-router-dom";
import { useCart } from "../../../features/cart/CartContext";

const DEFAULT_IMG = "/placeholder-part.webp";

export default function PartCard({ part }) {
  const { addItem } = useCart();

  const discount =
    part.compare_price && part.compare_price > part.price
      ? Math.round(((part.compare_price - part.price) / part.compare_price) * 100)
      : null;

  return (
    <div className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-blue-300 transition flex flex-col">
      <Link to={`/parts/${part.slug}`} className="block relative aspect-square bg-gray-50 overflow-hidden">
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
            ? "bg-green-100 text-green-700"
            : part.condition === "used"
            ? "bg-yellow-100 text-yellow-700"
            : "bg-blue-100 text-blue-700"
        }`}>
          {part.condition}
        </span>
      </Link>

      <div className="p-3 flex flex-col flex-1">
        <Link to={`/parts/${part.slug}`} className="text-sm font-medium text-gray-800 hover:text-blue-600 line-clamp-2 mb-1">
          {part.title}
        </Link>

        <p className="text-xs text-gray-400 mb-2">{part.seller_name}</p>

        {part.rating_count > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <span className="text-yellow-400 text-xs">★</span>
            <span className="text-xs text-gray-600">{part.avg_rating}</span>
            <span className="text-xs text-gray-400">({part.rating_count})</span>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2">
          <div>
            <span className="text-base font-bold text-gray-900">
              ${(part.price / 100).toFixed(2)}
            </span>
            {part.compare_price && (
              <span className="text-xs text-gray-400 line-through ml-1">
                ${(part.compare_price / 100).toFixed(2)}
              </span>
            )}
          </div>
          <button
            onClick={() => addItem(part)}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition shrink-0"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
