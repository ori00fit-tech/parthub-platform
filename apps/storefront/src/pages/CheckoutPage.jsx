import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../features/cart/CartContext";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";
import { useAuth } from "../features/auth/AuthContext";
import { formatPriceGBP } from "../lib/formatters";

function formatMinorPrice(value) {
  return formatPriceGBP((Number(value || 0) / 100).toFixed(2));
}

export default function CheckoutPage() {
  const { items, totalItems, subtotal } = useCart();
  const { selectedVehicle, hasVehicle } = useSelectedVehicle();
  const { isAuthenticated, user } = useAuth();

  const shipping = totalItems > 0 ? 500 : 0;
  const total = subtotal + shipping;

  const [form, setForm] = useState({
    buyer_name: user?.name || "",
    buyer_email: user?.email || "",
    buyer_phone: "",
    buyer_city: "",
    buyer_address: "",
    notes: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      form.buyer_name.trim() &&
      form.buyer_email.trim() &&
      form.buyer_phone.trim() &&
      form.buyer_city.trim() &&
      form.buyer_address.trim()
    );
  }, [form]);

  function setField(key) {
    return (e) => {
      setSubmitted(false);
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitted(true);
  }

  if (!totalItems) {
    return (
      <section className="space-y-6 pb-10">
        <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              Checkout foundation
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">Your checkout is empty</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              Add parts to your cart first, then come back to continue the buyer flow.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <div className="text-5xl">🧾</div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">No items ready for checkout</h2>
          <p className="mt-2 text-sm text-gray-500">
            Browse the catalog, add parts, and build your order before checking out.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/parts"
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Browse parts
            </Link>
            <Link
              to="/cart"
              className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              Go to cart
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
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              Checkout foundation
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">Complete your order details</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              Review your cart, confirm your buyer information, and prepare the order flow.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/cart"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
            >
              Back to cart
            </Link>
            <Link
              to="/parts"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Buyer session</h2>
                <p className="text-sm text-gray-500">
                  Signed-in buyers get a cleaner continuity across account and orders.
                </p>
              </div>

              {isAuthenticated ? (
                <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                  Signed in as {user?.email || "buyer"}
                </span>
              ) : (
                <Link
                  to="/auth?redirect=/checkout"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Sign in before checkout
                </Link>
              )}
            </div>

            {!isAuthenticated ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Guest-style checkout foundation is visible here, but buyer sign-in is recommended for a smoother order flow.
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Vehicle context</h2>
                <p className="text-sm text-gray-500">
                  Vehicle context helps reduce wrong-part risk before final order placement.
                </p>
              </div>

              {hasVehicle && selectedVehicle ? (
                <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                  {selectedVehicle.label}
                </span>
              ) : (
                <Link
                  to="/vehicle-selector"
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                >
                  Select vehicle
                </Link>
              )}
            </div>

            {!hasVehicle ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No vehicle selected. You can continue, but fitment confidence will be weaker.
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Buyer details</h2>
              <p className="mt-1 text-sm text-gray-500">
                This form prepares the storefront checkout flow and buyer information structure.
              </p>
            </div>

            {submitted ? (
              <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Buyer information captured successfully. The next production step is wiring this page to the real checkout API flow.
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Full name
                </label>
                <input
                  value={form.buyer_name}
                  onChange={setField("buyer_name")}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={form.buyer_email}
                  onChange={setField("buyer_email")}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  value={form.buyer_phone}
                  onChange={setField("buyer_phone")}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
                  placeholder="+44 ..."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  value={form.buyer_city}
                  onChange={setField("buyer_city")}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
                  placeholder="London"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Address
                </label>
                <input
                  value={form.buyer_address}
                  onChange={setField("buyer_address")}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
                  placeholder="Street, building, postcode..."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Order notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={setField("notes")}
                  rows={4}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500"
                  placeholder="Optional notes about delivery, fitment, or order preferences..."
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                Save buyer details
              </button>

              <Link
                to="/auth?redirect=/checkout"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Buyer sign in
              </Link>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Order summary</h2>

            <div className="mt-5 space-y-4">
              {items.map((item) => {
                const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);

                return (
                  <div
                    key={item.part_id}
                    className="flex items-start justify-between gap-3 rounded-2xl bg-gray-50 p-4"
                  >
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-semibold text-gray-900">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                      {formatMinorPrice(lineTotal)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 space-y-3 border-t pt-5 text-sm">
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
              <div className="flex items-center justify-between text-base font-bold text-gray-900">
                <span>Total</span>
                <span>{formatMinorPrice(total)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Checkout readiness</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="rounded-2xl bg-gray-50 p-4">
                Cart is ready for buyer detail capture.
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                Vehicle context is recommended for stronger fitment confidence.
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                Final production step later: real API order submission and payment flow.
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Quick actions</h2>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                to="/cart"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Back to cart
              </Link>
              <Link
                to="/parts"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-black"
              >
                Browse more parts
              </Link>
              <Link
                to="/auth?redirect=/checkout"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Buyer sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
