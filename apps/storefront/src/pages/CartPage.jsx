import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../features/cart/CartContext";

export default function CartPage() {
  const { items, updateQuantity, removeItem, totalItems, subtotal } = useCart();
  const navigate = useNavigate();

  if (!totalItems) return (
    <div className="container-app py-24 text-center">
      <div className="text-5xl mb-4">🛒</div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
      <Link to="/parts" className="text-blue-600 hover:underline">Browse parts</Link>
    </div>
  );

  return (
    <div className="container-app py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Your Cart ({totalItems} items)</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.part_id} className="flex gap-4 p-4 border rounded-xl">
              <img src={item.thumbnail ?? "/placeholder-part.webp"} alt={item.title}
                className="w-20 h-20 object-cover rounded-lg bg-gray-100 shrink-0" />
              <div className="flex-1 min-w-0">
                <Link to={`/parts/${item.slug}`} className="font-medium text-gray-800 hover:text-blue-600 line-clamp-2 text-sm">
                  {item.title}
                </Link>
                <p className="text-xs text-gray-400 mt-1">{item.seller_name}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border rounded-lg overflow-hidden">
                    <button onClick={() => updateQuantity(item.part_id, item.quantity - 1)} className="px-2.5 py-1 hover:bg-gray-100 text-sm">−</button>
                    <span className="px-3 py-1 text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.part_id, item.quantity + 1)} className="px-2.5 py-1 hover:bg-gray-100 text-sm">+</button>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">${((item.price * item.quantity) / 100).toFixed(2)}</p>
                    <button onClick={() => removeItem(item.part_id)} className="text-xs text-red-400 hover:underline mt-1">Remove</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-xl p-6 h-fit space-y-3">
          <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>${(subtotal / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Shipping</span>
            <span>$5.00</span>
          </div>
          <div className="border-t pt-3 flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span>${((subtotal + 500) / 100).toFixed(2)}</span>
          </div>
          <button
            onClick={() => navigate("/checkout")}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition mt-4"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
