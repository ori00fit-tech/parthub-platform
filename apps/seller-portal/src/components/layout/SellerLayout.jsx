import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useT } from "../../i18n";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { LogoMark, LogoWordmark } from "@parthub/shared/brand";

function navClass({ isActive }) {
  return [
    "flex items-center whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition",
    isActive
      ? "bg-blue-50 text-blue-700"
      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
  ].join(" ");
}

// Claims waiting for the seller's reply (badge on "Returns").
function useWaitingClaims() {
  const { pathname } = useLocation();
  const [n, setN] = useState(0);
  useEffect(() => {
    let active = true;
    api
      .get("/api/v1/marketplace/me/issues")
      .then((res) => active && setN(Number(res?.data?.waiting || 0)))
      .catch(() => active && setN(0));
    return () => {
      active = false;
    };
  }, [pathname]);
  return n;
}

export default function SellerLayout({ children }) {
  const t = useT();
  const { user, logout } = useAuth();
  const waitingClaims = useWaitingClaims();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-6">
            <Link to="/" className="flex min-w-0 items-center gap-2" aria-label={t("PartHub Seller")}>
              <LogoMark className="h-9 w-9 flex-none" />
              <span className="truncate text-lg sm:text-xl">
                <LogoWordmark />
                <span className="ms-1.5 text-sm font-semibold text-slate-500">{t("Seller")}</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/parts/new"
              data-tour="add-part"
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

            <div data-tour="language">
              <LanguageSwitcher />
            </div>

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
            <NavLink to="/issues" className={navClass}>
              {t("Returns")}
              {waitingClaims ? (
                <span className="ms-1.5 rounded-full bg-amber-500 px-1.5 text-[11px] font-bold leading-5 text-white" aria-label={t("{n} waiting for your reply", { n: waitingClaims })}>
                  {waitingClaims}
                </span>
              ) : null}
            </NavLink>
            <NavLink to="/requests" className={navClass} data-tour="requests">{t("Requests")}</NavLink>
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
