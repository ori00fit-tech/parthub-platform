import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useCart } from "../../features/cart/CartContext";
import { useAuth } from "../../features/auth/AuthContext";
import { useSelectedVehicle } from "../../features/vehicles/SelectedVehicleContext";
import Footer from "./Footer";

function navClass({ isActive }) {
  return [
    "text-sm font-medium transition",
    isActive ? "text-blue-700" : "text-gray-700 hover:text-blue-600",
  ].join(" ");
}

function mobileNavClass(isActive) {
  return [
    "flex flex-col items-center justify-center rounded-2xl px-3 py-3 text-sm font-semibold transition",
    isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
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
    { to: "/", label: "Home" },
    { to: "/parts", label: "Parts" },
    { to: "/vehicle-selector", label: "Vehicle" },
    { to: "/cart", label: "Cart" },
    { to: isAuthenticated ? "/account" : "/auth", label: isAuthenticated ? "Account" : "Sign in" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-6">
            <Link to="/" className="shrink-0 text-xl font-black tracking-tight text-slate-950">
              PartHub
            </Link>

            <nav className="hidden items-center gap-4 md:flex">
              <NavLink to="/" className={navClass}>Home</NavLink>
              <NavLink to="/parts" className={navClass}>Parts</NavLink>
              <NavLink to="/vehicle-selector" className={navClass}>Vehicle</NavLink>
              <NavLink to="/compare" className={navClass}>Compare</NavLink>
              <NavLink to="/orders" className={navClass}>Orders</NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/cart"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              Cart ({totalItems})
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
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold text-gray-900">Selected vehicle:</span>

              {selectedVehicle ? (
                <>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                    {vehicleLabel}
                  </span>

                  <Link
                    to="/vehicle-selector"
                    className="font-semibold text-blue-700 hover:underline"
                  >
                    Change
                  </Link>

                  <button
                    type="button"
                    onClick={clearVehicle}
                    className="font-semibold text-gray-500 transition hover:text-red-600"
                  >
                    Clear
                  </button>
                </>
              ) : (
                <Link
                  to="/vehicle-selector"
                  className="font-semibold text-blue-700 hover:underline"
                >
                  Choose your vehicle
                </Link>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {!isAuthenticated ? (
                <Link
                  to="/auth"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                >
                  Buyer sign-in available
                </Link>
              ) : null}

              <Link
                to="/checkout"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Checkout
              </Link>

              <Link
                to="/compare"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Compare
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white md:hidden">
          <div className="mx-auto grid max-w-7xl grid-cols-5 gap-2 px-4 py-3 sm:px-6">
            {navItems.map((item) => {
              const active =
                item.to === "/"
                  ? location.pathname === "/"
                  : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

              return (
                <Link key={item.to} to={item.to} className={mobileNavClass(active)}>
                  {item.label}
                  {item.to === "/cart" && totalItems > 0 ? (
                    <span className="mt-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-bold text-white">
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
