import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useT } from "../../i18n";
import LanguageSwitcher from "../common/LanguageSwitcher";

function navClass({ isActive }) {
  return [
    "flex items-center whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition",
    isActive
      ? "bg-blue-50 text-blue-700"
      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
  ].join(" ");
}

export default function SellerLayout({ children }) {
  const t = useT();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-6">
            <Link to="/" className="truncate text-lg font-black tracking-tight text-slate-950 sm:text-xl">
              {t("PartHub Seller")}
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/parts/create"
              className="hidden whitespace-nowrap rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 sm:inline-flex"
            >
              {t("+ Add part")}
            </Link>

            <div className="hidden max-w-[160px] text-end lg:block">
              <p className="truncate text-sm font-semibold text-gray-900">
                {user?.name || user?.email || t("Seller")}
              </p>
              <p className="text-xs text-gray-500">{t("Seller session active")}</p>
            </div>

            <LanguageSwitcher />

            <button
              onClick={logout}
              className="whitespace-nowrap rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold sm:px-4 text-gray-700 transition hover:bg-gray-50"
            >
              {t("Sign out")}
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white">
          <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
            <NavLink to="/" className={navClass}>{t("Dashboard")}</NavLink>
            <NavLink to="/parts" className={navClass}>{t("Inventory")}</NavLink>
            <NavLink to="/orders" className={navClass}>{t("Orders")}</NavLink>
            <NavLink to="/requests" className={navClass}>{t("Requests")}</NavLink>
            <NavLink to="/reviews" className={navClass}>{t("Reviews")}</NavLink>
            <NavLink to="/insights" className={navClass}>{t("Insights")}</NavLink>
            <NavLink to="/store-settings" className={navClass}>{t("Store")}</NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
