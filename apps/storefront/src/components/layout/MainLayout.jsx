import { Link, NavLink } from "react-router-dom";
import { useCart } from "../../features/cart/CartContext";
import { useAuth } from "../../features/auth/AuthContext";
import { useSelectedVehicle } from "../../features/vehicles/SelectedVehicleContext";

function navClass({ isActive }) {
  return [
    "text-sm font-medium transition",
    isActive ? "text-blue-600" : "text-gray-600 hover:text-gray-900",
  ].join(" ");
}

function mobileNavClass({ isActive }) {
  return [
    "flex flex-col items-center justify-center rounded-2xl px-3 py-2 text-xs font-semibold transition",
    isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
  ].join(" ");
}

export default function MainLayout({ children }) {
  const { totalItems } = useCart();
  const { user, logout, isAuthenticated } = useAuth();
  const { selectedVehicle, clearVehicle } = useSelectedVehicle();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-6">
            <Link to="/" className="shrink-0 text-xl font-black tracking-tight text-slate-950">
              PartHub
            </Link>

            <nav className="hidden items-center gap-4 md:flex">
              <NavLink to="/" className={navClass}>
                Home
              </NavLink>
              <NavLink to="/parts" className={navClass}>
                Parts
              </NavLink>
              <NavLink to="/categories" className={navClass}>
                Categories
              </NavLink>
              <NavLink to="/vehicle-selector" className={navClass}>
                My Vehicle
              </NavLink>
              {isAuthenticated ? (
                <NavLink to="/orders" className={navClass}>
                  Orders
                </NavLink>
              ) : null}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/search"
              className="hidden rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 sm:inline-flex"
            >
              Search
            </Link>

            <Link
              to="/cart"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
            >
              <span>Cart</span>
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                {totalItems}
              </span>
            </Link>

            {isAuthenticated ? (
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  to="/account"
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                >
                  Account
                </Link>
                <button
                  onClick={logout}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 bg-gray-50">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="min-w-0 text-sm text-gray-600">
              {selectedVehicle ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-900">Selected vehicle:</span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                    {selectedVehicle.label}
                  </span>
                  <Link
                    to="/vehicle-selector"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Change
                  </Link>
                  <button
                    onClick={clearVehicle}
                    className="text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span>No vehicle selected.</span>
                  <Link
                    to="/vehicle-selector"
                    className="font-medium text-blue-600 hover:text-blue-700"
                  >
                    Select your vehicle
                  </Link>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {isAuthenticated ? (
                <span className="rounded-full bg-white px-3 py-1 ring-1 ring-gray-200">
                  Signed in{user?.email ? `: ${user.email}` : ""}
                </span>
              ) : (
                <Link
                  to="/auth"
                  className="rounded-full bg-white px-3 py-1 font-medium text-gray-600 ring-1 ring-gray-200 hover:text-gray-900"
                >
                  Buyer sign-in available
                </Link>
              )}

              <Link
                to="/checkout"
                className="rounded-full bg-white px-3 py-1 font-medium text-gray-600 ring-1 ring-gray-200 hover:text-gray-900"
              >
                Checkout
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white md:hidden">
          <div className="mx-auto grid max-w-7xl grid-cols-5 gap-2 px-4 py-3 sm:px-6">
            <NavLink to="/" className={mobileNavClass}>
              <span>Home</span>
            </NavLink>

            <NavLink to="/parts" className={mobileNavClass}>
              <span>Parts</span>
            </NavLink>

            <NavLink to="/vehicle-selector" className={mobileNavClass}>
              <span>Vehicle</span>
            </NavLink>

            <NavLink to="/cart" className={mobileNavClass}>
              <span>Cart</span>
              <span className="mt-1 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                {totalItems}
              </span>
            </NavLink>

            <NavLink
              to={isAuthenticated ? "/account" : "/auth"}
              className={mobileNavClass}
            >
              <span>{isAuthenticated ? "Account" : "Sign in"}</span>
            </NavLink>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div>
            <h3 className="text-lg font-bold text-slate-950">PartHub</h3>
            <p className="mt-2 text-sm text-gray-600">
              Vehicle-first storefront foundation for browsing, fitment, cart, buyer auth, and checkout flow.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900">Browse</h4>
            <div className="mt-3 space-y-2 text-sm">
              <Link to="/parts" className="block text-gray-600 hover:text-gray-900">
                All parts
              </Link>
              <Link to="/categories" className="block text-gray-600 hover:text-gray-900">
                Categories
              </Link>
              <Link to="/search" className="block text-gray-600 hover:text-gray-900">
                Search
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900">Buyer flow</h4>
            <div className="mt-3 space-y-2 text-sm">
              <Link to="/cart" className="block text-gray-600 hover:text-gray-900">
                Cart
              </Link>
              <Link to="/checkout" className="block text-gray-600 hover:text-gray-900">
                Checkout
              </Link>
              <Link to="/vehicle-selector" className="block text-gray-600 hover:text-gray-900">
                Vehicle selector
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900">Account</h4>
            <div className="mt-3 space-y-2 text-sm">
              <Link to={isAuthenticated ? "/account" : "/auth"} className="block text-gray-600 hover:text-gray-900">
                {isAuthenticated ? "Buyer account" : "Sign in"}
              </Link>
              <Link to="/orders" className="block text-gray-600 hover:text-gray-900">
                Orders
              </Link>
              <Link to="/wishlist" className="block text-gray-600 hover:text-gray-900">
                Wishlist
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
