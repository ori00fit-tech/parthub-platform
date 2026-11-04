import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useCart } from "../../features/cart/CartContext";
import CartDrawer from "../../features/cart/CartDrawer";
import { useAuth } from "../../features/auth/AuthContext";
import { useSelectedVehicle } from "../../features/vehicles/SelectedVehicleContext";
import { formatPrice } from "../../lib/formatters";
import BrandMark, { Wordmark } from "../brand/BrandMark";
import Footer from "./Footer";

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

function categoryNavClass(isActive) {
  return [
    "flex items-center whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition",
    isActive ? "border-link text-white" : "border-transparent text-navy-ink/70 hover:text-white",
  ].join(" ");
}

function mobileNavItemClass(active) {
  return [
    "flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-semibold transition",
    active ? "bg-navy/10 text-navy" : "text-muted hover:bg-surface-3 hover:text-ink",
  ].join(" ");
}

const ICONS = {
  home: <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z" />,
  parts: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </>
  ),
  garage: (
    <>
      <path d="M3 13l2-6h14l2 6v5H3z" />
      <circle cx="7.5" cy="18" r="1.5" />
      <circle cx="16.5" cy="18" r="1.5" />
    </>
  ),
  request: <path d="M4 5h16v11H8l-4 4zM8 9h8M8 12h5" />,
  cart: (
    <>
      <path d="M3 4h2.2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2" />
      <circle cx="10" cy="20.5" r="1.4" />
      <circle cx="17.5" cy="20.5" r="1.4" />
    </>
  ),
};

function Icon({ name, className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalItems, subtotal, openCart } = useCart();
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
    { label: "Brakes & Suspension", to: "/parts?q=brake" },
    { label: "Engine & Filters", to: "/parts?q=engine" },
    { label: "Electrical & Lighting", to: "/parts?q=battery" },
    { label: "Transmission", to: "/parts?q=transmission" },
    { label: "Exhaust", to: "/parts?q=exhaust" },
    { label: "Fluids & Oils", to: "/parts?q=oil" },
    { label: "Request a part", to: "/request-part" },
  ];

  const mobileNav = [
    { label: "Home", to: "/", icon: "home" },
    { label: "Parts", to: "/parts", icon: "parts" },
    { label: "Garage", to: "/vehicle-selector", icon: "garage" },
    { label: "Request", to: "/request-part", icon: "request" },
  ];

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Paints the phone status-bar band in the header color. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] bg-navy-deep" style={{ height: "env(safe-area-inset-top, 0px)" }} />

      <div className="border-b border-line bg-[#0B1222] text-[12.5px] text-muted">
        <div className="mx-auto flex min-h-[34px] max-w-[1380px] flex-wrap items-center gap-x-5 gap-y-1 px-4 py-1.5 lg:px-6">
          <span>
            <strong className="font-semibold text-white">Vehicle-checked parts</strong> from verified sellers
          </span>
          <span className="hidden sm:inline">Compare listings · Seller trust badges</span>
          <span className="hidden md:inline">Can't find it? Sellers reply to part requests</span>
          <span className="flex-1" />
          <Link to="/orders" className="hidden hover:text-ink sm:inline">
            Track order
          </Link>
        </div>
      </div>

      <header
        className="sticky z-40 border-b border-black/40 bg-gradient-to-b from-navy to-navy-deep shadow-[0_8px_24px_-12px_rgba(0,0,0,.7)]"
        style={{ top: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto grid max-w-[1380px] grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 px-4 py-3 md:grid-cols-[auto_1fr_auto] lg:gap-x-6 lg:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="PartHub home">
            <BrandMark className="h-10 w-10" />
            <span className="min-w-0">
              <Wordmark />
              <span className="mt-0.5 hidden font-mono text-[10px] uppercase tracking-[0.14em] text-[#A9BBF5] sm:block">
                OEM · aftermarket · used
              </span>
            </span>
          </Link>

          <form
            onSubmit={submitHeaderSearch}
            role="search"
            className="order-3 col-span-2 flex min-w-0 overflow-hidden rounded-xl border border-white/15 bg-navy-night focus-within:border-link md:order-none md:col-span-1"
          >
            <label htmlFor="header-search" className="sr-only">
              Search parts
            </label>
            <input
              id="header-search"
              type="search"
              value={headerQuery}
              onChange={(e) => setHeaderQuery(e.target.value)}
              placeholder="Part name, SKU or OEM number…"
              className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-[#8FA2CF]"
            />
            <button type="submit" aria-label="Search" className="flex w-12 items-center justify-center text-navy-ink transition hover:bg-white/5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>
          </form>

          <div className="flex items-center justify-end gap-1.5 text-white">
            <Link
              to="/vehicle-selector"
              className="hidden max-w-[220px] items-center gap-2 rounded-lg px-3 py-1.5 text-left transition hover:bg-white/10 xl:flex"
            >
              <Icon name="garage" className="h-6 w-6 flex-none" />
              <span className="min-w-0">
                <small className="block text-[11px] leading-tight text-[#A9BBF5]">{vehicleLabel ? "Your vehicle" : "No vehicle"}</small>
                <b className="block truncate text-[13.5px] leading-tight">{vehicleLabel || "Select vehicle"}</b>
              </span>
            </Link>

            <Link
              to="/request-part"
              className="hidden rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10 lg:inline-flex"
            >
              Request a part
            </Link>

            <Link
              to={isAuthenticated ? "/account" : "/auth"}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition hover:bg-white/10"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
              </svg>
              <span className="hidden sm:block">
                <small className="block text-[11px] leading-tight text-[#A9BBF5]">{isAuthenticated ? "Signed in" : "Hello, sign in"}</small>
                <b className="block text-[13.5px] leading-tight">Account</b>
              </span>
            </Link>

            <button
              type="button"
              onClick={openCart}
              aria-label={`Open cart, ${totalItems} ${totalItems === 1 ? "item" : "items"}`}
              className="relative flex items-center gap-2.5 rounded-lg border border-white/15 bg-black/20 py-1.5 pl-2 pr-3 transition hover:bg-black/30"
            >
              <Icon name="cart" className="h-[26px] w-[26px]" />
              <span
                key={totalItems}
                className="absolute -top-1.5 left-6 h-5 min-w-[20px] animate-[cartbump_.35s_ease] rounded-full bg-white px-1.5 text-center font-mono text-[11.5px] font-bold leading-5 text-navy-deep shadow-[0_0_0_2px_#172F7E]"
                aria-hidden="true"
              >
                {totalItems}
              </span>
              <span className="hidden text-left sm:block">
                <small className="block text-[11px] leading-tight text-[#A9BBF5]">Cart</small>
                <b className="block font-mono text-[13.5px] leading-tight">{formatPrice(subtotal)}</b>
              </span>
            </button>
          </div>
        </div>

        <nav aria-label="Categories" className="hidden border-t border-white/10 lg:block">
          <div className="mx-auto flex max-w-[1380px] items-center gap-1 overflow-x-auto px-4 lg:px-6">
            {categoryLinks.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                aria-current={location.pathname + location.search === item.to ? "page" : undefined}
                className={categoryNavClass(location.pathname + location.search === item.to)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1380px] px-4 py-8 lg:px-6">
        <Outlet />
      </main>

      <Footer />

      <nav
        aria-label="Quick navigation"
        className="sticky bottom-0 z-30 border-t border-line bg-surface/95 shadow-[0_-6px_18px_-12px_rgba(15,23,42,.25)] backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto grid max-w-[1380px] grid-cols-5 gap-1 px-3 py-1.5">
          {mobileNav.map((item) => {
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <Link key={item.to} to={item.to} className={mobileNavItemClass(active)}>
                <Icon name={item.icon} />
                <span className="mt-0.5">{item.label}</span>
              </Link>
            );
          })}
          <button type="button" onClick={openCart} className={`${mobileNavItemClass(false)} relative`}>
            <Icon name="cart" />
            <span className="mt-0.5">Cart</span>
            {totalItems > 0 ? (
              <span className="absolute right-3 top-1 h-4 min-w-[18px] rounded-full bg-navy px-1 text-center font-mono text-[10px] font-bold leading-4 text-white">
                {totalItems}
              </span>
            ) : null}
          </button>
        </div>
      </nav>

      <CartDrawer />
    </div>
  );
}
