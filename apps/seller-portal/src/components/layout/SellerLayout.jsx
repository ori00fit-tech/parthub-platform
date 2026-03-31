import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function navClass({ isActive }) {
  return [
    "flex items-center rounded-xl px-3 py-2 text-sm font-medium transition",
    isActive
      ? "bg-blue-50 text-blue-700"
      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
  ].join(" ");
}

export default function SellerLayout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-black tracking-tight text-slate-950">
              PartHub Seller
            </Link>

            <nav className="hidden items-center gap-2 md:flex">
              <NavLink to="/" className={navClass}>Dashboard</NavLink>
              <NavLink to="/parts" className={navClass}>Inventory</NavLink>
              <NavLink to="/orders" className={navClass}>Orders</NavLink>
              <NavLink to="/reviews" className={navClass}>Reviews</NavLink>
              <NavLink to="/store-settings" className={navClass}>Store</NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/parts/create"
              className="hidden rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 sm:inline-flex"
            >
              + Add part
            </Link>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-gray-900">
                {user?.name || user?.email || "Seller"}
              </p>
              <p className="text-xs text-gray-500">Seller session active</p>
            </div>

            <button
              onClick={logout}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white md:hidden">
          <div className="mx-auto grid max-w-7xl grid-cols-5 gap-2 px-4 py-3 sm:px-6">
            <NavLink to="/" className={navClass}>Home</NavLink>
            <NavLink to="/parts" className={navClass}>Parts</NavLink>
            <NavLink to="/orders" className={navClass}>Orders</NavLink>
            <NavLink to="/reviews" className={navClass}>Reviews</NavLink>
            <NavLink to="/store-settings" className={navClass}>Store</NavLink>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
