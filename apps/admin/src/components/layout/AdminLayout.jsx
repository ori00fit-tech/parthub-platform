import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/sellers", label: "Sellers", icon: "🏪" },
  { to: "/parts", label: "Parts", icon: "🔩" },
  { to: "/categories", label: "Categories", icon: "📂" },
  { to: "/vehicles", label: "Vehicles", icon: "🚗" },
  { to: "/orders", label: "Orders", icon: "📦" },
  { to: "/reviews", label: "Reviews", icon: "⭐" },
];

function isActivePath(itemTo, pathname) {
  if (itemTo === "/") return pathname === "/";
  return pathname === itemTo || pathname.startsWith(`${itemTo}/`);
}

function SidebarContent({ pathname, onNavigate, user, logout }) {
  return (
    <div className="flex h-full flex-col bg-gray-950">
      <div className="border-b border-gray-800 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-xl shadow-lg shadow-blue-900/40">
            🛡️
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-white">PartHub Admin</p>
            <p className="truncate text-xs text-gray-400">Control panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active = isActivePath(item.to, pathname);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={[
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                active
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                  : "text-gray-300 hover:bg-gray-900 hover:text-white",
              ].join(" ")}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-gray-800 p-4">
        <div className="rounded-2xl bg-gray-900 p-4">
          <p className="truncate text-sm font-semibold text-gray-100">
            {user?.name || "Admin"}
          </p>
          <p className="truncate text-xs text-gray-500">
            {user?.email || "admin@parthub.local"}
          </p>

          <button
            onClick={logout}
            className="mt-4 w-full rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-950/40"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentLabel = useMemo(() => {
    const current = navItems.find((item) => isActivePath(item.to, pathname));
    return current?.label || "Admin";
  }, [pathname]);

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Mobile topbar */}
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-800 bg-gray-900 text-xl text-gray-100"
            aria-label="Open navigation"
          >
            ☰
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black text-white">PartHub Admin</p>
            <p className="truncate text-xs text-gray-400">{currentLabel}</p>
          </div>

          <button
            onClick={logout}
            className="rounded-2xl border border-gray-800 bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-100"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        {/* Desktop sidebar */}
        <aside className="hidden w-72 border-r border-gray-800 lg:block">
          <SidebarContent
            pathname={pathname}
            onNavigate={undefined}
            user={user}
            logout={logout}
          />
        </aside>

        {/* Mobile drawer */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              className="absolute inset-0 bg-black/60"
              onClick={closeMobileMenu}
              aria-label="Close navigation overlay"
            />
            <aside className="absolute left-0 top-0 h-full w-[84vw] max-w-[320px] border-r border-gray-800 shadow-2xl">
              <SidebarContent
                pathname={pathname}
                onNavigate={closeMobileMenu}
                user={user}
                logout={() => {
                  closeMobileMenu();
                  logout();
                }}
              />
            </aside>
          </div>
        ) : null}

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-7xl">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
