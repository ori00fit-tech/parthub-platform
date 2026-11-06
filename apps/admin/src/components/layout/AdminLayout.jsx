import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useT } from "../../i18n";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { usePendingCounts } from "../../lib/pending";
import { Icon } from "@parthub/shared/icons";

// Nav items whose badge shows how many items wait for moderation.
const PENDING_KEY = { "/sellers": "sellers", "/parts": "parts", "/reviews": "reviews", "/issues": "issues" };

const navItems = [
  { to: "/", label: "Dashboard", icon: "dashboard" },
  { to: "/sellers", label: "Sellers", icon: "sellers" },
  { to: "/parts", label: "Parts", icon: "parts" },
  { to: "/categories", label: "Categories", icon: "categories" },
  { to: "/vehicles", label: "Vehicles", icon: "vehicles" },
  { to: "/orders", label: "Orders", icon: "orders" },
  { to: "/issues", label: "Returns", icon: "warning" },
  { to: "/reviews", label: "Reviews", icon: "messages" },
  { to: "/analytics", label: "Analytics", icon: "insights" },
];

function isActivePath(itemTo, pathname) {
  if (itemTo === "/") return pathname === "/";
  return pathname === itemTo || pathname.startsWith(`${itemTo}/`);
}

function SidebarContent({ pathname, onNavigate, user, logout, pending }) {
  const t = useT();
  return (
    <div className="flex h-full flex-col bg-gray-950">
      <div className="border-b border-gray-800 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-900/40">
            <Icon name="oem_origin" className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-white">{t("PartHub Admin")}</p>
            <p className="truncate text-xs text-gray-400">{t("Control panel")}</p>
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
              <Icon name={item.icon} className="h-5 w-5" />
              <span className="flex-1">{t(item.label)}</span>
              {PENDING_KEY[item.to] && pending?.[PENDING_KEY[item.to]] > 0 ? (
                <span
                  className={[
                    "min-w-[24px] rounded-full px-2 py-0.5 text-center text-xs font-bold",
                    active ? "bg-white text-blue-700" : "bg-amber-400 text-gray-950",
                  ].join(" ")}
                  title={t("{n} waiting for review", { n: pending[PENDING_KEY[item.to]] })}
                >
                  {pending[PENDING_KEY[item.to]]}
                  <span className="sr-only"> {t("waiting for review")}</span>
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-gray-800 p-4">
        <div className="rounded-2xl bg-gray-900 p-4">
          <p className="truncate text-sm font-semibold text-gray-100">
            {user?.name || t("Admin")}
          </p>
          <p className="truncate text-xs text-gray-500">
            {user?.email || "admin@parthub.local"}
          </p>

          <LanguageSwitcher className="mt-4 w-fit" />

          <button
            onClick={logout}
            className="mt-4 w-full rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-950/40"
          >
            {t("Sign out")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const t = useT();
  const { user, logout } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;
  const [mobileOpen, setMobileOpen] = useState(false);
  const pending = usePendingCounts(pathname);
  const pendingTotal = (pending.sellers || 0) + (pending.parts || 0) + (pending.reviews || 0);

  const currentLabel = useMemo(() => {
    const current = navItems.find((item) => isActivePath(item.to, pathname));
    return current?.label ? t(current.label) : t("Admin");
  }, [pathname, t]);

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
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-800 bg-gray-900 text-xl text-gray-100"
            aria-label={t("Open navigation")}
          >
            <Icon name="menu" className="h-6 w-6" />
            {pendingTotal > 0 ? (
              <span className="absolute -end-1 -top-1 min-w-[20px] rounded-full bg-amber-400 px-1.5 text-center text-[11px] font-bold leading-5 text-gray-950">
                {pendingTotal}
              </span>
            ) : null}
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black text-white">{t("PartHub Admin")}</p>
            <p className="truncate text-xs text-gray-400">{currentLabel}</p>
          </div>

          <LanguageSwitcher />

          <button
            onClick={logout}
            className="rounded-2xl border border-gray-800 bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-100"
          >
            {t("Sign out")}
          </button>
        </div>
      </header>

      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        {/* Desktop sidebar */}
        <aside className="hidden w-72 border-e border-gray-800 lg:block">
          <SidebarContent
            pathname={pathname}
            onNavigate={undefined}
            user={user}
            logout={logout}
            pending={pending}
          />
        </aside>

        {/* Mobile drawer */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              className="absolute inset-0 bg-black/60"
              onClick={closeMobileMenu}
              aria-label={t("Close navigation overlay")}
            />
            <aside className="absolute start-0 top-0 h-full w-[84vw] max-w-[320px] border-e border-gray-800 shadow-2xl">
              <SidebarContent
                pathname={pathname}
                onNavigate={closeMobileMenu}
                pending={pending}
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
