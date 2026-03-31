import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useCart } from "../features/cart/CartContext";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";

export default function AccountPage() {
  const { isAuthenticated, user, logout } = useAuth();
  const { totalItems } = useCart();
  const { selectedVehicle, hasVehicle } = useSelectedVehicle();

  if (!isAuthenticated) {
    return (
      <section className="space-y-6 pb-10">
        <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              Buyer account foundation
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">Sign in to access your account</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              View buyer information, orders, vehicle context, and continue the storefront flow.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Link
            to="/auth?redirect=/account"
            className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-blue-700">Recommended</p>
            <p className="mt-1 text-xl font-bold text-gray-900">Buyer sign in</p>
            <p className="mt-2 text-sm text-gray-600">
              Unlock account and order continuity.
            </p>
          </Link>

          <Link
            to="/cart"
            className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-gray-500">Current cart</p>
            <p className="mt-1 text-xl font-bold text-gray-900">Go to cart</p>
            <p className="mt-2 text-sm text-gray-600">
              Review your parts before checkout.
            </p>
          </Link>

          <Link
            to="/parts"
            className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-gray-500">Catalog</p>
            <p className="mt-1 text-xl font-bold text-gray-900">Browse parts</p>
            <p className="mt-2 text-sm text-gray-600">
              Continue exploring inventory.
            </p>
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
              Buyer account foundation
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">Your buyer account</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              Central place for buyer identity, order entry points, cart context, and selected vehicle.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/orders"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
            >
              View orders
            </Link>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">Buyer profile</h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Email</p>
                <p className="mt-1 font-semibold text-gray-900">{user?.email || "Not available"}</p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Role</p>
                <p className="mt-1 font-semibold text-gray-900">{user?.role || "buyer"}</p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-gray-400">Session state</p>
                <p className="mt-1 font-semibold text-gray-900">Authenticated storefront buyer session active</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">Selected vehicle</h2>

            {hasVehicle && selectedVehicle ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-blue-700">Active vehicle</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{selectedVehicle.label}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Make</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {selectedVehicle.make_name || selectedVehicle.make || "—"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Model</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {selectedVehicle.model_name || selectedVehicle.model || "—"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Year</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {selectedVehicle.year || "—"}
                    </p>
                  </div>
                </div>

                <Link
                  to="/vehicle-selector"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                >
                  Update vehicle
                </Link>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                No vehicle selected yet.
                <div className="mt-3">
                  <Link
                    to="/vehicle-selector"
                    className="font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Select your vehicle
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Storefront state</h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Cart items</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{totalItems}</p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Orders area</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">Ready</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Quick actions</h2>

            <div className="mt-4 flex flex-col gap-3">
              <Link
                to="/orders"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                View orders
              </Link>

              <Link
                to="/checkout"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
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
                to="/parts"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-black"
              >
                Browse parts
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">What comes next</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="rounded-2xl bg-gray-50 p-4">
                Orders history can plug into real buyer order APIs later.
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                Account profile details can expand without touching seller/admin portals.
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                Vehicle context remains reusable across browsing and checkout.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
