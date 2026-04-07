import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useCart } from "../../features/cart/CartContext";
import { useAuth } from "../../features/auth/AuthContext";
import { useSelectedVehicle } from "../../features/vehicles/SelectedVehicleContext";
import Footer from "./Footer";

function getVehicleLabel(vehicle) {
  if (!vehicle) return "Select Vehicle";
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

function desktopNavClass({ isActive }) {
  return [
    "flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition whitespace-nowrap",
    isActive
      ? "border-blue-600 text-blue-600"
      : "border-transparent text-gray-500 hover:text-gray-900",
  ].join(" ");
}

function mobileNavItemClass(active) {
  return [
    "flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-semibold transition",
    active ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
  ].join(" ");
}

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const { isAuthenticated } = useAuth();
  const { selectedVehicle } = useSelectedVehicle();

  const [headerQuery, setHeaderQuery] = useState("");

  const vehicleLabel = useMemo(() => getVehicleLabel(selectedVehicle), [selectedVehicle]);

  function submitHeaderSearch(e) {
    e.preventDefault();
    const q = headerQuery.trim();
    navigate(q ? `/parts?q=${encodeURIComponent(q)}` : "/parts");
  }

  const categoryLinks = [
    { label: "All Categories", to: "/parts" },
    { label: "Engine", to: "/parts?q=engine" },
    { label: "Brakes", to: "/parts?q=brake" },
    { label: "Suspension", to: "/parts?q=suspension" },
    { label: "Electrical", to: "/parts?q=battery" },
    { label: "Filters", to: "/parts?q=filter" },
    { label: "Flash Deals", to: "/parts?sort=price_asc" },
  ];

  const mobileNav = [
    { label: "Home", to: "/", icon: "⌂" },
    { label: "Parts", to: "/parts", icon: "⚙️" },
    { label: "Garage", to: "/vehicle-selector", icon: "🚗" },
    { label: "Compare", to: "/compare", icon: "⇄" },
    { label: "Cart", to: "/cart", icon: "🛒" },
  ];

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-[#0f172a]">
      <div className="bg-slate-950 px-4 py-2 text-center text-[11px] font-medium text-white">
        Vehicle-aware marketplace · Compare parts · Seller trust · Checkout flow
      </div>

      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1380px] items-center gap-3 px-4 py-3 lg:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg text-white shadow-sm">
              ⚙️
            </div>
            <div className="min-w-0">
              <div className="text-xl font-black tracking-tight text-slate-950">
                Part<span className="text-blue-600">Hub</span>
              </div>
            </div>
          </Link>

          <form
            onSubmit={submitHeaderSearch}
            className="hidden min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-[#f4f6fb] md:flex"
          >
            <input
              value={headerQuery}
              onChange={(e) => setHeaderQuery(e.target.value)}
              placeholder="Search parts, brands, OEM numbers…"
              className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm outline-none"
            />
            <button
              type="submit"
              className="bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Search
            </button>
          </form>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/vehicle-selector"
              className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-gray-50 lg:flex"
            >
              <span>🚗</span>
              <span className="max-w-[170px] truncate">{vehicleLabel}</span>
            </Link>

            <Link
              to="/orders"
              className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-gray-50 sm:inline-flex"
            >
              Orders
            </Link>

            <Link
              to="/cart"
              className="relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-gray-50"
            >
              <span>Cart</span>
              <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-blue-600 px-2 text-xs font-bold text-white">
                {totalItems}
              </span>
            </Link>

            <Link
              to={isAuthenticated ? "/account" : "/auth"}
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              {isAuthenticated ? "Account" : "Sign in"}
            </Link>
          </div>
        </div>

        <div className="border-t border-gray-200 bg-white">
          <div className="mx-auto hidden max-w-[1380px] items-center gap-1 overflow-x-auto px-4 lg:flex lg:px-6">
            {categoryLinks.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={desktopNavClass}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white md:hidden">
          <div className="mx-auto grid max-w-[1380px] grid-cols-5 gap-2 px-4 py-2">
            {mobileNav.map((item) => {
              const active =
                item.to === "/"
                  ? location.pathname === "/"
                  : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

              return (
                <Link key={item.to} to={item.to} className={mobileNavItemClass(active)}>
                  <span className="text-base">{item.icon}</span>
                  <span className="mt-1">{item.label}</span>
                  {item.to === "/cart" && totalItems > 0 ? (
                    <span className="mt-1 inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">
                      {totalItems}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1380px] px-4 py-8 lg:px-6">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
