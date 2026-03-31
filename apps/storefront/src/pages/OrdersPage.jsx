import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useCart } from "../features/cart/CartContext";

export default function OrdersPage() {
  const { isAuthenticated, user } = useAuth();
  const { totalItems } = useCart();

  if (!isAuthenticated) {
    return (
      <section className="space-y-6 pb-10">
        <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              Orders foundation
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">Sign in to view your orders</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              Buyer sign-in prepares access to order history and tracking entry points.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Link
            to="/auth?redirect=/orders"
            className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-blue-700">Recommended</p>
            <p className="mt-1 text-xl font-bold text-gray-900">Buyer sign in</p>
            <p className="mt-2 text-sm text-gray-600">Continue to your orders area.</p>
          </Link>

          <Link
            to="/checkout"
            className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-gray-500">Checkout</p>
            <p className="mt-1 text-xl font-bold text-gray-900">Go to checkout</p>
            <p className="mt-2 text-sm text-gray-600">Complete buyer details first.</p>
          </Link>

          <Link
            to="/cart"
            className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-gray-500">Cart</p>
            <p className="mt-1 text-xl font-bold text-gray-900">Review cart</p>
            <p className="mt-2 text-sm text-gray-600">You currently have {totalItems} item(s).</p>
          </Link>
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
              Orders foundation
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">Your orders</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              This storefront area is ready for buyer order history, status, and tracking integration.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/account"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
            >
              Back to account
            </Link>
            <Link
              to="/checkout"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Go to checkout
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Buyer orders area</h2>
          <p className="mt-2 text-sm text-gray-500">
            Signed in as {user?.email || "buyer"}.
          </p>

          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
            <h3 className="text-xl font-bold text-gray-900">No orders yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Once the real checkout submission flow is wired, completed orders can appear here.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/checkout"
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Continue to checkout
              </Link>
              <Link
                to="/parts"
                className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Browse parts
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Order flow status</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="rounded-2xl bg-gray-50 p-4">
                Buyer authentication foundation: ready.
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                Cart and checkout foundations: ready.
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                Real order history API integration: next backend-connected step.
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Quick actions</h2>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                to="/checkout"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-black"
              >
                Go to checkout
              </Link>
              <Link
                to="/cart"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Review cart
              </Link>
              <Link
                to="/account"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Back to account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
