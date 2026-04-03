import { Link } from "react-router-dom";
import { useCart } from "../features/cart/CartContext";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";
import { formatPriceGBP } from "../lib/formatters";

function getVehicleLabel(vehicle) {
  if (!vehicle) return "";
  return (
    vehicle.label ||
    [
      vehicle.year,
      vehicle.make_name || vehicle.makeName || vehicle.make,
      vehicle.model_name || vehicle.modelName || vehicle.model,
      vehicle.engine_name || vehicle.engineName || vehicle.engine,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export default function CartPage() {
  const cart = useCart() || {};
  const {
    items = [],
    totalItems = 0,
    subtotal = 0,
    updateItemQuantity = () => {},
    removeItem = () => {},
    clearCart = () => {},
  } = cart;

  const vehicleCtx = useSelectedVehicle();
  const selectedVehicle = vehicleCtx?.selectedVehicle || null;

  const vehicleLabel = getVehicleLabel(selectedVehicle);

  if (!items.length) {
    return (
      <section className="space-y-6">
        <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-700 p-6 text-white shadow-lg sm:p-8">
          <h1 className="text-3xl font-bold sm:text-5xl">Your cart</h1>
          <p className="mt-3 text-sm text-blue-100 sm:text-base">
            Review selected parts before checkout.
          </p>
        </div>

        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Your cart is empty</h2>
          <p className="mt-2 text-sm text-gray-500">
            Browse the marketplace and add parts to continue.
          </p>
          <Link
            to="/parts"
            className="mt-5 inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Browse parts
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 pb-16">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="text-3xl font-bold sm:text-5xl">Your cart</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              Review selected parts and continue to checkout.
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white">
            {totalItems} item{totalItems === 1 ? "" : "s"} selected
          </div>
        </div>
      </div>

      {selectedVehicle ? (
        <div className="rounded-3xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800 shadow-sm">
          Checkout context includes your selected vehicle:
          <span className="ml-2 font-semibold">{vehicleLabel}</span>
        </div>
      ) : (
        <div className="rounded-3xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-700 shadow-sm">
          No vehicle selected. You can still checkout, but fitment confirmation is stronger when a vehicle is selected.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id || item.part_id}
              className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="h-24 w-full overflow-hidden rounded-2xl bg-gray-100 sm:w-28">
                  {item.image_url || item.thumbnail ? (
                    <img
                      src={item.image_url || item.thumbnail}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-400">
                      No image
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{item.title}</h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Seller: {item.seller_name || "Unknown seller"}
                      </p>
                      <p className="mt-2 text-base font-bold text-gray-900">
                        {formatPriceGBP(item.price)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id || item.part_id)}
                      className="inline-flex h-10 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        updateItemQuantity(item.id || item.part_id, Math.max(1, Number(item.quantity || 1) - 1))
                      }
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-lg text-gray-700"
                    >
                      −
                    </button>

                    <span className="min-w-[44px] text-center text-sm font-semibold text-gray-900">
                      {item.quantity || 1}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        updateItemQuantity(item.id || item.part_id, Number(item.quantity || 1) + 1)
                      }
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-lg text-gray-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Order summary</h2>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Items</span>
              <span>{totalItems}</span>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatPriceGBP(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-gray-900">Estimated total</span>
                <span className="text-xl font-bold text-gray-900">{formatPriceGBP(subtotal)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <Link
              to="/checkout"
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Continue to checkout
            </Link>

            <button
              type="button"
              onClick={clearCart}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              Clear cart
            </button>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            Guest checkout is supported. Final fitment confirmation should still rely on SKU, OEM reference, and seller guidance.
          </p>
        </aside>
      </div>
    </section>
  );
}
