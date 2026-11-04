import { Link, NavLink } from "react-router-dom";
import { useCart } from "../../features/cart/CartContext";
import { useSelectedVehicle } from "../../features/vehicles/SelectedVehicleContext";

function navClass({ isActive }) {
  return [
    "px-4 py-2 rounded-xl text-sm font-semibold transition",
    isActive ? "bg-navy/[0.06] text-link" : "text-ink-2 hover:bg-surface-3",
  ].join(" ");
}

export default function Header() {
  const { cart } = useCart();
  const { selectedVehicle } = useSelectedVehicle();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-[1280px] items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-navy to-blue-700 text-white shadow-lg shadow-black/40">
            <span className="text-lg font-black">PH</span>
          </div>
          <div className="leading-tight">
            <div className="text-xl font-extrabold tracking-tight text-ink">
              PartHub Maroc 🇲🇦
            </div>
            <div className="text-xs text-muted">Auto parts marketplace</div>
          </div>
        </Link>

        <div className="hidden min-w-0 flex-1 lg:block">
          <div className="mx-auto flex max-w-xl overflow-hidden rounded-2xl border border-line bg-surface-2">
            <input
              className="w-full bg-transparent px-4 py-3 text-sm outline-none placeholder:text-faint"
              placeholder="Search parts, brands, OEM number..."
            />
            <button className="bg-navy px-5 text-sm font-bold text-white transition hover:bg-navy-deep">
              Search
            </button>
          </div>
        </div>

        <nav className="ml-auto flex items-center gap-1">
          <NavLink to="/" className={navClass}>
            Home
          </NavLink>
          <NavLink to="/parts" className={navClass}>
            Parts
          </NavLink>
          <NavLink to="/vehicle-selector" className={navClass}>
            Vehicle
          </NavLink>
        </nav>

        <div className="hidden xl:flex items-center gap-2">
          <Link
            to="/vehicle-selector"
            className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink-2 hover:border-navy hover:text-blue-800"
          >
            {selectedVehicle?.label || "My vehicle"}
          </Link>

          <Link
            to="/cart"
            className="relative rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink-2 hover:border-navy hover:text-blue-800"
          >
            Cart
            {cart?.items?.length ? (
              <span className="absolute -right-2 -top-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {cart.items.length}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  );
}
