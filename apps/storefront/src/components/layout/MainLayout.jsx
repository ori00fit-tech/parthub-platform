import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useCart } from "../../features/cart/CartContext";
import { useAuth } from "../../features/auth/AuthContext";
import { useSelectedVehicle } from "../../features/vehicles/SelectedVehicleContext";
import Footer from "./Footer";

function navClass({ isActive }) {
  return [
    "inline-flex items-center rounded-2xl px-4 py-2 text-sm font-semibold transition",
    isActive
      ? "bg-blue-50 text-blue-700"
      : "text-gray-700 hover:bg-gray-50 hover:text-blue-600",
  ].join(" ");
}

function mobileNavClass(isActive) {
  return [
    "flex flex-col items-center justify-center rounded-2xl px-3 py-3 text-xs font-semibold transition",
    isActive
      ? "bg-blue-50 text-blue-700"
      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
  ].join(" ");
}

function getVehicleLabel(vehicle) {
  if (!vehicle) return "";

  return (
    vehicle.label ||
    [
      vehicle.year,
      vehicle.make_name || vehicle.makeName || vehicle.make,
      vehicle.model_name || vehicle.modelName || vehicle.model,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export default function MainLayout() {
  const location = useLocation();
  const { totalItems } = useCart();
  const { isAuthenticated } = useAuth();
  const { selectedVehicle, clearVehicle } = useSelectedVehicle();

  const vehicleLabel = getVehicleLabel(selectedVehicle);

  const navItems = [
    { to: "/", label: "Home", icon: "⌂" },
    { to: "/parts", label: "Parts", icon: "⚙️" },
    { to: "/vehicle-selector", label: "Garage", icon: "🚗" },
    { to: "/compare", label: "Compare", icon: "⇄" },
    { to: "/cart", label: "Cart", icon: "🛒" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="border-b border-slate-800 bg-slate-950 px-4 py-2 text-center text-[11px] font-medium tracking-wide text-slate-200 sm:px-6">
        Vehicle-aware marketplace · Compare parts · Seller trust · Checkout flow
      </div>

      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4 lg:gap-6">
            <Link to="/" className="shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-xl text-white shadow-sm">
                  ⚙️
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xl font-black tracking-tight text-slate-950">
                    PartHub
                  </p>
                  <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Auto Parts Marketplace
                  </p>
                </div>
              </div>
            </Link>

            <div className="hidden xl:block">
              {selectedVehicle ? (
                <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <span className="text-lg">🚗</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-500">
                      Garage vehicle
                    </p>
                    <p className="truncate text-sm font-bold text-blue-900">
                      {vehicleLabel}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to="/vehicle-selector"
                      className="inline-flex h-9 items-center justify-center rounded-xl bg-white px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      Change
                    </Link>
                    <button
                      type="button"
                      onClick={clearVehicle}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-blue-200 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  to="/vehicle-selector"
                  className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 transition hover:bg-white"
                >
                  <span className="text-lg">🚗</span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Garage
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      Choose your vehicle
                    </p>
                  </div>
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-2 lg:flex">
              <NavLink to="/" className={navClass}>
                Home
              </NavLink>
              <NavLink to="/parts" className={navClass}>
                Parts
              </NavLink>
              <NavLink to="/vehicle-selector" className={navClass}>
                Garage
              </NavLink>
              <NavLink to="/compare" className={navClass}>
                Compare
              </NavLink>
              <NavLink to="/orders" className={navClass}>
                Orders
              </NavLink>
            </nav>

            <Link
              to="/cart"
              className="relative inline-flex h-12 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              Cart
              {totalItems > 0 ? (
                <span className="ml-2 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-bold text-white">
                  {totalItems}
                </span>
              ) : null}
            </Link>

            <Link
              to={isAuthenticated ? "/account" : "/auth"}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {isAuthenticated ? "Account" : "Sign in"}
            </Link>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold text-gray-900">Marketplace paths:</span>

              <Link
                to="/parts"
                className="rounded-full bg-gray-100 px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-200"
              >
                Browse parts
              </Link>

              <Link
                to="/vehicle-selector"
                className="rounded-full bg-gray-100 px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-200"
              >
                Open Garage
              </Link>

              <Link
                to="/compare"
                className="rounded-full bg-gray-100 px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-200"
              >
                Compare
              </Link>

              <Link
                to="/checkout"
                className="rounded-full bg-gray-100 px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-200"
              >
                Checkout
              </Link>
            </div>

            <div className="text-sm text-gray-500">
              {selectedVehicle
                ? "Garage is active and ready to guide discovery."
                : "Add a vehicle in Garage for stronger fitment discovery."}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white lg:hidden">
          <div className="mx-auto grid max-w-7xl grid-cols-5 gap-2 px-4 py-3 sm:px-6">
            {navItems.map((item) => {
              const active =
                item.to === "/"
                  ? location.pathname === "/"
                  : location.pathname === item.to ||
                    location.pathname.startsWith(`${item.to}/`);

              return (
                <Link key={item.to} to={item.to} className={mobileNavClass(active)}>
                  <span className="text-base">{item.icon}</span>
                  <span className="mt-1">{item.label}</span>
                  {item.to === "/cart" && totalItems > 0 ? (
                    <span className="mt-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                      {totalItems}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
