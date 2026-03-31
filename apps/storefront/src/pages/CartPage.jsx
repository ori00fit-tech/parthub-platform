import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../features/cart/CartContext";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";
import { formatPriceGBP } from "../lib/formatters";

function formatMinorPrice(value) {
  return formatPriceGBP((Number(value || 0) / 100).toFixed(2));
}

export default function CartPage() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, clearCart, totalItems, subtotal } = useCart();
  const { selectedVehicle, hasVehicle } = useSelectedVehicle();

  const shipping = totalItems > 0 ? 500 : 0;
  const total = subtotal + shipping;

  if (!totalItems) {
    return (
      <section className="space-y-6 pb-10">
        <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              Cart foundation
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">Your cart is empty</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              Start with your vehicle, browse the catalog, and add parts to continue toward checkout.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Link
            to="/vehicle-selector"
            className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-blue-700">Best starting point</p>
            <p className="mt-1 text-xl font-bold text-gray-900">Select your vehicle</p>
            <p className="mt-2 text-sm text-gray-600">
              Improve fitment confidence before adding parts.
            </p>
          </Link>

          <Link
            to="/parts"
            className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-gray-500">Browse inventory</p>
            <p className="mt-1 text-xl font-bold text-gray-900">Explore the catalog</p>
            <p className="mt-2 text-sm text-gray-600">
              Search by part name, category, brand, or SKU.
            </p>
          </Link>

          <Link
            to="/auth"
            className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-gray-500">Buyer foundation</p>
            <p className="mt-1 text-xl font-bold text-gray-900">Sign in</p>
            <p className="mt-2 text-sm text-gray-600">
              Prepare your account for a smoother checkout flow.
            </p>
          </Link>
        </div>

        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <div className="text-5xl">🛒</div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">No items yet</h2>
          <p className="mt-2 text-sm text-gray-500">
            Once you add parts, they’ll appear here with quantity controls and order summary.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/parts"
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Browse parts
            </Link>
            <Link
              to="/vehicle-selector"
              className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              Choose vehicle
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 pb-10">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              Cart foundation
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">
              Your cart ({totalItems} item{totalItems > 1 ? "s" : ""})
            </h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              Review your selected parts, confirm quantities, and continue toward checkout.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/parts"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
            >
              Continue shopping
            </Link>
            <button
              type="button"
              onClick={clearCart}
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Clear cart
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Vehicle context</h2>
                <p className="text-sm text-gray-500">
                  Reviewing parts with vehicle context reduces wrong-part risk.
                </p>
              </div>

              {hasVehicle && selectedVehicle ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                    {selectedVehicle.label}
                  </span>
                  <Link
                    to="/vehicle-selector"
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    Change vehicle
                  </Link>
                </div>
              ) : (
                <Link
                  to="/vehicle-selector"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Select vehicle
                </Link>
              )}
            </div>

            {!hasVehicle ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No vehicle selected. You can still continue, but fitment confidence will be weaker.
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            {items.map((item) => {
              const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);

              return (
                <article
                  key={item.part_id}
                  className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="grid h-full grid-cols-1 sm:grid-cols-[120px_1fr]">
                    <div className="bg-gray-100">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-[120px] items-center justify-center text-sm text-gray-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <Link
                            to={`/parts/${item.slug}`}
                            className="line-clamp-2 text-xl font-bold text-gray-900 hover:text-blue-600"
                          >
                            {item.title}
                          </Link>

                          <div className="mt-2 space-y-1 text-sm text-gray-500">
                            <p>Seller: {item.seller_name || "Marketplace seller"}</p>
                            {hasVehicle && selectedVehicle ? (
                              <p>Vehicle context: {selectedVehicle.label}</p>
                            ) : (
                              <p>No vehicle context selected</p>
                            )}
                          </div>
                        </div>

                        <div className="text-left lg:text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            {formatMinorPrice(lineTotal)}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {formatMinorPrice(item.price)} each
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex h-12 items-center rounded-2xl border border-gray-200 bg-white">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.part_id, item.quantity - 1)}
                            className="h-full w-12 text-lg text-gray-700 hover:bg-gray-50"
                          >
                            −
                          </button>
                          <span className="flex h-full min-w-[52px] items-center justify-center border-x border-gray-200 px-3 text-sm font-semibold text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.part_id, item.quantity + 1)}
                            className="h-full w-12 text-lg text-gray-700 hover:bg-gray-50"
                          >
                            +
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Link
                            to={`/parts/${item.slug}`}
                            className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                          >
                            View part
                          </Link>

                          <button
                            type="button"
                            onClick={() => removeItem(item.part_id)}
                            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Order summary</h2>

            <div className="mt-5 space-y-4 text-sm">
              <div className="flex items-center justify-between text-gray-600">
                <span>Items</span>
                <span>{totalItems}</span>
              </div>

              <div className="flex items-center justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatMinorPrice(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-gray-600">
                <span>Estimated shipping</span>
                <span>{formatMinorPrice(shipping)}</span>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between text-base font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatMinorPrice(total)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => navigate("/checkout")}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Proceed to checkout
              </button>

              <Link
                to="/auth"
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Buyer sign in
              </Link>

              <Link
                to="/parts"
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Continue shopping
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Checkout readiness</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="rounded-2xl bg-gray-50 p-4">
                Review quantities before checkout.
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                Keep vehicle context active for stronger fitment confidence.
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                Buyer sign-in helps prepare a smoother order flow.
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Need another part?</h2>
            <p className="mt-2 text-sm text-gray-600">
              Return to the catalog and keep building your order.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                to="/parts"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-black"
              >
                Browse more parts
              </Link>
              <Link
                to="/vehicle-selector"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Update vehicle
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
