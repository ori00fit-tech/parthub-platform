import { Link, NavLink, Outlet } from "react-router-dom";
import { useCart } from "../../features/cart/CartContext";
import { useAuth } from "../../features/auth/AuthContext";
import { useSelectedVehicle } from "../../features/vehicles/SelectedVehicleContext";

function navClass({ isActive }) {
  return [
    "text-sm font-medium transition",
    isActive ? "text-blue-700" : "text-gray-700 hover:text-blue-600",
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
  const { totalItems } = useCart();
  const { isAuthenticated } = useAuth();
  const { selectedVehicle, clearVehicle } = useSelectedVehicle();

  const vehicleLabel = getVehicleLabel(selectedVehicle);

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
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {selectedVehicle ? (
              <div className="hidden items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 lg:flex">
                <Link to="/parts" className="text-xs font-semibold text-gray-800">
                  {vehicleLabel}
                </Link>
                <button
                  type="button"
                  onClick={clearVehicle}
                  className="text-xs font-semibold text-red-600"
                >
                  Clear
                </button>
              </div>
            ) : null}

            <Link to="/cart" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50">
              Cart ({totalItems})
            </Link>

            <Link
              to={isAuthenticated ? "/account" : "/auth"}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {isAuthenticated ? "Account" : "Sign in"}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
