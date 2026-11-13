import ChangePasswordForm, { DeletionCancelledNotice, DevicesList } from "@parthub/shared/account";
import { apiDelete, apiGet, apiPost } from "../lib/api";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useCart } from "../features/cart/CartContext";
import { useSelectedVehicle } from "../features/vehicles/SelectedVehicleContext";
import { useT } from "../i18n";
import StockAlertsList from "../features/stock/StockAlertsList";

export default function AccountPage() {
  const t = useT();
  const { isAuthenticated, user, logout, replaceToken } = useAuth();
  const { totalItems } = useCart();
  const { selectedVehicle, hasVehicle } = useSelectedVehicle();

  if (!isAuthenticated) {
    return (
      <section className="space-y-6 pb-10">
        <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              {t("My Account")}
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">{t("Sign in to access your account")}</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              {t("See your orders, part requests and saved vehicle.")}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Link
            to="/auth?redirect=/account"
            className="rounded-3xl border border-navy/20 bg-navy/[0.06] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-link">{t("Recommended")}</p>
            <p className="mt-1 text-xl font-bold text-ink">{t("Buyer sign in")}</p>
            <p className="mt-2 text-sm text-muted">
              {t("Track your orders and part requests.")}
            </p>
          </Link>

          <Link
            to="/cart"
            className="rounded-3xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-muted">{t("Current cart")}</p>
            <p className="mt-1 text-xl font-bold text-ink">{t("Go to cart")}</p>
            <p className="mt-2 text-sm text-muted">
              {t("Review your parts before checkout.")}
            </p>
          </Link>

          <Link
            to="/parts"
            className="rounded-3xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-muted">{t("Catalog")}</p>
            <p className="mt-1 text-xl font-bold text-ink">{t("Browse parts")}</p>
            <p className="mt-2 text-sm text-muted">
              {t("Continue exploring inventory.")}
            </p>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 pb-10">
      <DeletionCancelledNotice t={t} />
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              {t("My Account")}
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">{t("Your buyer account")}</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              {t("Central place for buyer identity, order entry points, cart context, and selected vehicle.")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/orders"
              className="inline-flex items-center justify-center rounded-2xl bg-surface px-5 py-3 text-sm font-semibold text-ink transition hover:bg-navy/[0.12]"
            >
              {t("View orders")}
            </Link>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              {t("Sign out")}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-ink">{t("Buyer profile")}</h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-surface-2 p-4">
                <p className="text-xs uppercase tracking-wide text-faint">{t("Email")}</p>
                <p className="mt-1 font-semibold text-ink">{user?.email || t("Not available")}</p>
              </div>

              <div className="rounded-2xl bg-surface-2 p-4">
                <p className="text-xs uppercase tracking-wide text-faint">{t("Role")}</p>
                <p className="mt-1 font-semibold text-ink">{user?.role && user.role !== "buyer" ? user.role : t("Buyer")}</p>
              </div>

              <div className="rounded-2xl bg-surface-2 p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-faint">{t("Status")}</p>
                <p className="mt-1 font-semibold text-ink">{t("Signed in")}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-ink">{t("Selected vehicle")}</h2>

            {hasVehicle && selectedVehicle ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-navy/[0.06] p-4">
                  <p className="text-xs uppercase tracking-wide text-link">{t("Active vehicle")}</p>
                  <p className="mt-1 text-lg font-semibold text-ink">{selectedVehicle.label}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-surface-2 p-4">
                    <p className="text-xs uppercase tracking-wide text-faint">{t("Make")}</p>
                    <p className="mt-1 font-semibold text-ink">
                      {selectedVehicle.make_name || selectedVehicle.make || "—"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-surface-2 p-4">
                    <p className="text-xs uppercase tracking-wide text-faint">{t("Model")}</p>
                    <p className="mt-1 font-semibold text-ink">
                      {selectedVehicle.model_name || selectedVehicle.model || "—"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-surface-2 p-4">
                    <p className="text-xs uppercase tracking-wide text-faint">{t("Year")}</p>
                    <p className="mt-1 font-semibold text-ink">
                      {selectedVehicle.year || "—"}
                    </p>
                  </div>
                </div>

                <Link
                  to="/vehicle-selector"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-line-strong bg-surface px-4 text-sm font-semibold text-ink-2 transition hover:bg-surface-3"
                >
                  {t("Update vehicle")}
                </Link>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-line-strong bg-surface-2 px-4 py-6 text-sm text-muted">
                {t("No vehicle selected yet.")}
                <div className="mt-3">
                  <Link
                    to="/vehicle-selector"
                    className="font-semibold text-link hover:text-blue-800"
                  >
                    {t("Select your vehicle")}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <StockAlertsList />

          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-xl font-bold text-ink">{t("Quick actions")}</h2>

            <div className="mt-4 flex flex-col gap-3">
              <Link
                to="/orders"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy-deep"
              >
                {t("View orders")}
              </Link>

              <Link
                to="/checkout"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-line-strong bg-surface px-5 text-sm font-semibold text-ink-2 transition hover:bg-surface-3"
              >
                {t("Go to checkout")}
              </Link>

              <Link
                to="/cart"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-line-strong bg-surface px-5 text-sm font-semibold text-ink-2 transition hover:bg-surface-3"
              >
                {t("Review cart")}
              </Link>

              <Link
                to="/parts"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-black"
              >
                {t("Browse parts")}
              </Link>
            </div>
          </div>

        </div>
      </div>
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-bold text-ink">{t("Password")}</h2>
        <div className="mt-3">
          <ChangePasswordForm
            t={t}
            submit={(current, next) => apiPost("/api/v1/auth/password", { current_password: current, new_password: next }, { auth: true }).then((r) => r?.data)}
            onToken={replaceToken}
          />
        </div>
      </div>
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-bold text-ink">{t("My devices")}</h2>
        <p className="mt-1 text-sm text-muted">{t("Where your account is signed in. Sign out a device you do not recognise.")}</p>
        <div className="mt-3">
          <DevicesList
            t={t}
            get={(p) => apiGet(p, undefined, { auth: true }).then((r) => r?.data)}
            del={(p) => apiDelete(p, { auth: true })}
            post={(p, b) => apiPost(p, b, { auth: true })}
            onEverywhere={logout}
          />
        </div>
      </div>
      <p className="text-center text-sm">
        <Link to="/delete-account" className="font-semibold text-red-700 hover:underline">{t("Delete my account")}</Link>
      </p>
    </section>
  );
}
