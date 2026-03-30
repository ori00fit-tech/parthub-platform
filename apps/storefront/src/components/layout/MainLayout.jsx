import { Link, useLocation } from "react-router-dom";

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
            <NavLink to="/cart">Cart</NavLink>
            <NavLink to="/account">Account</NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
