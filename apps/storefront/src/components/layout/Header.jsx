import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { useCart } from "../../features/cart/CartContext";
import { useVehicle } from "../../features/vehicles/VehicleContext";

export default function Header() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const { selectedVehicle } = useVehicle();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="container-app flex items-center justify-between h-16 gap-4">

        {/* Logo */}
        <Link to="/" className="text-xl font-bold text-blue-600 shrink-0">
          PartHub
        </Link>

        {/* Vehicle selector strip */}
        {selectedVehicle ? (
          <button
            onClick={() => navigate("/vehicle-selector")}
            className="hidden sm:flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200 hover:bg-blue-100 transition"
          >
            <span>🚗</span>
            <span className="font-medium">{selectedVehicle.display_label}</span>
            <span className="text-blue-400">▾</span>
          </button>
        ) : (
          <button
            onClick={() => navigate("/vehicle-selector")}
            className="hidden sm:flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition"
          >
            <span>🚗</span> Select your vehicle
          </button>
        )}

        {/* Search */}
        <form
          className="flex-1 max-w-xl hidden md:block"
          onSubmit={(e) => {
            e.preventDefault();
            const q = new FormData(e.target).get("q");
            if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
          }}
        >
          <input
            name="q"
            type="search"
            placeholder="Search parts, makes, models…"
            className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/cart" className="relative p-2 hover:text-blue-600 transition">
            🛒
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              <Link to="/account" className="text-sm font-medium text-gray-700 hover:text-blue-600">
                {user.name.split(" ")[0]}
              </Link>
              <button onClick={logout} className="text-sm text-gray-400 hover:text-red-500">
                Logout
              </button>
            </div>
          ) : (
            <Link to="/auth" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
