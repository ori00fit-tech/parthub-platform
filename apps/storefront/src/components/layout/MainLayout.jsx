import { Link, useLocation } from "react-router-dom";
import { useSelectedVehicle } from "../../features/vehicles/SelectedVehicleContext";

function NavLink({ to, children }) {
  const location = useLocation();
  const active = location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <Link
      to={to}
      className={[
        "rounded-lg px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-blue-50 text-blue-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export default function MainLayout({ children }) {
  const { vehicle, hasVehicle, clearVehicle } = useSelectedVehicle();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-sm">
              PH
            </div>
            <div>
              <p className="text-sm font-bold leading-none text-gray-900">PartHub UK 🇬🇧</p>
              <p className="text-[11px] text-gray-500">Auto parts marketplace</p>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/parts">Parts</NavLink>
            <NavLink to="/vehicle-selector">Vehicle</NavLink>
          </nav>
        </div>

        <div className="border-t border-gray-100 bg-gray-50">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                Vehicle context
              </div>

              {hasVehicle ? (
                <div className="text-sm text-gray-700">
                  <span className="font-semibold">{vehicle.makeName}</span>
                  {" • "}
                  <span className="font-semibold">{vehicle.modelName}</span>
                  {" • "}
                  <span className="font-semibold">{vehicle.year}</span>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  No vehicle selected yet
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/vehicle-selector"
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Change vehicle
              </Link>

              {hasVehicle ? (
                <button
                  type="button"
                  onClick={clearVehicle}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
