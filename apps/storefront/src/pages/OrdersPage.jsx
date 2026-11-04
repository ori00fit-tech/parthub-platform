import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useCart } from "../features/cart/CartContext";
import { useT } from "../i18n";

export default function OrdersPage() {
  const t = useT();
  const { isAuthenticated, user } = useAuth();
  const { totalItems } = useCart();

  if (!isAuthenticated) {
    return (
      <section className="space-y-6 pb-10">
        <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              {t("Orders foundation")}
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">{t("Sign in to view your orders")}</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              {t("Buyer sign-in prepares access to order history and tracking entry points.")}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Link
            to="/auth?redirect=/orders"
            className="rounded-3xl border border-navy/20 bg-navy/[0.06] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-link">{t("Recommended")}</p>
            <p className="mt-1 text-xl font-bold text-ink">{t("Buyer sign in")}</p>
            <p className="mt-2 text-sm text-muted">{t("Continue to your orders area.")}</p>
          </Link>

          <Link
            to="/checkout"
            className="rounded-3xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-muted">{t("Checkout")}</p>
            <p className="mt-1 text-xl font-bold text-ink">{t("Go to checkout")}</p>
            <p className="mt-2 text-sm text-muted">{t("Complete buyer details first.")}</p>
          </Link>

          <Link
            to="/cart"
            className="rounded-3xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-muted">{t("Cart")}</p>
            <p className="mt-1 text-xl font-bold text-ink">{t("Review cart")}</p>
            <p className="mt-2 text-sm text-muted">{t("You currently have {n} item(s).", { n: totalItems })}</p>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 pb-10">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              {t("Orders foundation")}
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">{t("Your orders")}</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              {t("This storefront area is ready for buyer order history, status, and tracking integration.")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/account"
              className="inline-flex items-center justify-center rounded-2xl bg-surface px-5 py-3 text-sm font-semibold text-ink transition hover:bg-navy/[0.12]"
            >
              {t("Back to account")}
            </Link>
            <Link
              to="/checkout"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              {t("Go to checkout")}
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-ink">{t("Buyer orders area")}</h2>
          <p className="mt-2 text-sm text-muted">
            {t("Signed in as {email}.", { email: user?.email || t("buyer") })}
          </p>

          <div className="mt-6 rounded-2xl border border-dashed border-line-strong bg-surface-2 px-4 py-8 text-center">
            <h3 className="text-xl font-bold text-ink">{t("No orders yet")}</h3>
            <p className="mt-2 text-sm text-muted">
              {t("Once the real checkout submission flow is wired, completed orders can appear here.")}
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/checkout"
                className="btn-cta rounded-2xl px-5 py-3 text-sm"
              >
                {t("Continue to checkout")}
              </Link>
              <Link
                to="/parts"
                className="rounded-2xl border border-line-strong bg-surface px-5 py-3 text-sm font-semibold text-ink-2 transition hover:bg-surface-3"
              >
                {t("Browse parts")}
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-xl font-bold text-ink">{t("Order flow status")}</h2>
            <div className="mt-4 space-y-3 text-sm text-muted">
              <div className="rounded-2xl bg-surface-2 p-4">
                {t("Buyer authentication foundation: ready.")}
              </div>
              <div className="rounded-2xl bg-surface-2 p-4">
                {t("Cart and checkout foundations: ready.")}
              </div>
              <div className="rounded-2xl bg-surface-2 p-4">
                {t("Real order history API integration: next backend-connected step.")}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-xl font-bold text-ink">{t("Quick actions")}</h2>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                to="/checkout"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-black"
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
                to="/account"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-line-strong bg-surface px-5 text-sm font-semibold text-ink-2 transition hover:bg-surface-3"
              >
                {t("Back to account")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
