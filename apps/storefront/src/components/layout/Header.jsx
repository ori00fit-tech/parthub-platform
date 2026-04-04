import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { useCart } from "../../features/cart/CartContext";
import { useSelectedVehicle } from "../../features/vehicles/SelectedVehicleContext";

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

export default function Header() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCart();
  const { selectedVehicle, clearVehicle } = useSelectedVehicle();

  const vehicleLabel = getVehicleLabel(selectedVehicle);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <Link to="/" className="shrink-0 text-xl font-bold text-blue-600">
            PartHub
          </Link>

          <nav className="hidden items-center gap-5 md:flex">
            <Link to="/parts" className="text-sm font-medium text-gray-700 transition hover:text-blue-600">
              Parts
            </Link>
            <Link to="/vehicle-selector" className="text-sm font-medium text-gray-700 transition hover:text-blue-600">
              Vehicle
            </Link>
            <Link to="/compare" className="text-sm font-medium text-gray-700 transition hover:text-blue-600">
              Compare
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {selectedVehicle ? (
            <div className="hidden items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 lg:flex">
              <button
                type="button"
                onClick={() => navigate("/parts")}
                className="text-xs font-semibold text-gray-800"
              >
                {vehicleLabel}
              </button>
              <button
                type="button"
                onClick={clearVehicle}
                className="text-xs font-semibold text-red-600"
              >
                Clear
              </button>
            </div>
          ) : null}

          <Link to="/cart" className="relative rounded-xl p-2 transition hover:text-blue-600">
            <span className="text-sm font-medium text-gray-700">Cart</span>
            {totalItems > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-bold text-white">
                {totalItems}
              </span>
            ) : null}
          </Link>

          {isAuthenticated ? (
            <div className="hidden items-center gap-3 sm:flex">
              <Link to="/account" className="text-sm font-medium text-gray-700 hover:text-blue-600">
                {user?.name || "Account"}
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
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
    </header>
  );
}
