import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useCart } from "../features/cart/CartContext";
import { useT } from "../i18n";

function getRedirectPath(location) {
  const params = new URLSearchParams(location.search);
  return params.get("redirect") || "/account";
}

export default function AuthPage() {
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const redirectTo = useMemo(() => getRedirectPath(location), [location]);

  const { login, register, loading, isAuthenticated, user } = useAuth();
  const { totalItems } = useCart();

  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const inputCls =
    "h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-sky-400";

  function setField(key) {
    return (e) => {
      setError("");
      setSuccess("");
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (!form.email.trim() || !form.password.trim()) {
        setError(t("Please enter your email and password."));
        return;
      }

      if (mode === "register" && !form.name.trim()) {
        setError(t("Please enter your full name."));
        return;
      }

      if (mode === "login") {
        await login(form.email.trim(), form.password);
        navigate(redirectTo);
        return;
      }

      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      setSuccess(t("Account created successfully. Please sign in."));
      setMode("login");
      setForm((prev) => ({
        ...prev,
        password: "",
      }));
    } catch (err) {
      setError(err?.message || t("Authentication failed."));
    }
  }

  if (isAuthenticated) {
    return (
      <section className="space-y-6 pb-10">
        <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              {t("Buyer account")}
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">{t("You are already signed in")}</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              {t("Continue to your account, orders, checkout, or return to the catalog.")}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-ink">{t("Signed-in session")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="text-xs uppercase tracking-wide text-faint">{t("Email")}</p>
              <p className="mt-1 font-semibold text-ink">{user?.email || t("Buyer account")}</p>
            </div>
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="text-xs uppercase tracking-wide text-faint">{t("Cart items")}</p>
              <p className="mt-1 font-semibold text-ink">{totalItems}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={redirectTo}
              className="rounded-2xl bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy-deep"
            >
              {t("Continue")}
            </Link>
            <Link
              to="/account"
              className="rounded-2xl border border-line-strong bg-surface px-5 py-3 text-sm font-semibold text-ink-2 transition hover:bg-surface-3"
            >
              {t("Go to account")}
            </Link>
            <Link
              to="/parts"
              className="rounded-2xl border border-line-strong bg-surface px-5 py-3 text-sm font-semibold text-ink-2 transition hover:bg-surface-3"
            >
              {t("Browse parts")}
            </Link>
          </div>
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
              {t("Buyer auth foundation")}
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">
              {mode === "login" ? t("Sign in to continue") : t("Create your buyer account")}
            </h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              {mode === "login"
                ? t("Access your buyer session for account, orders, cart, and checkout flow.")
                : t("Create a buyer account to prepare a smoother storefront and checkout experience.")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm">
              {t("✔ Buyer-only storefront auth")}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm">
              {t("✔ Session-ready checkout flow")}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-xl font-bold text-ink">{t("Why sign in?")}</h2>
            <div className="mt-4 space-y-3 text-sm text-muted">
              <div className="rounded-2xl bg-surface-2 p-4">
                {t("Continue more smoothly from cart to checkout.")}
              </div>
              <div className="rounded-2xl bg-surface-2 p-4">
                {t("Prepare access to buyer account and order history foundation.")}
              </div>
              <div className="rounded-2xl bg-surface-2 p-4">
                {t("Keep the storefront flow cleaner across future sessions.")}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-xl font-bold text-ink">{t("Current storefront state")}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-surface-2 p-4">
                <p className="text-xs uppercase tracking-wide text-faint">{t("Cart items")}</p>
                <p className="mt-1 text-lg font-semibold text-ink">{totalItems}</p>
              </div>
              <div className="rounded-2xl bg-surface-2 p-4">
                <p className="text-xs uppercase tracking-wide text-faint">{t("Post-login redirect")}</p>
                <p className="mt-1 text-sm font-semibold text-ink">{redirectTo}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/cart"
                className="rounded-2xl border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink-2 transition hover:bg-surface-3"
              >
                {t("Back to cart")}
              </Link>
              <Link
                to="/parts"
                className="rounded-2xl border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink-2 transition hover:bg-surface-3"
              >
                {t("Browse parts")}
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={[
                "rounded-2xl px-5 py-2.5 text-sm font-semibold transition",
                mode === "login"
                  ? "bg-slate-950 text-white"
                  : "border border-line-strong bg-surface text-ink-2 hover:bg-surface-3",
              ].join(" ")}
            >
              {t("Sign in")}
            </button>

            <button
              type="button"
              onClick={() => switchMode("register")}
              className={[
                "rounded-2xl px-5 py-2.5 text-sm font-semibold transition",
                mode === "register"
                  ? "bg-slate-950 text-white"
                  : "border border-line-strong bg-surface text-ink-2 hover:bg-surface-3",
              ].join(" ")}
            >
              {t("Create account")}
            </button>
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-bold text-ink">
              {mode === "login" ? t("Buyer sign in") : t("Buyer registration")}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {mode === "login"
                ? t("Enter your email and password to continue.")
                : t("Create your buyer account with basic details.")}
            </p>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "register" ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-2">
                  {t("Full name")}
                </label>
                <input
                  value={form.name}
                  onChange={setField("name")}
                  placeholder={t("John Doe")}
                  className={inputCls}
                />
              </div>
            ) : null}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-2">
                {t("Email")}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={setField("email")}
                placeholder="you@example.com"
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-2">
                {t("Password")}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={setField("password")}
                placeholder="••••••••"
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-navy px-5 text-sm font-semibold text-white transition hover:bg-navy-deep disabled:cursor-not-allowed disabled:bg-navy/50"
            >
              {loading
                ? t("Please wait...")
                : mode === "login"
                  ? t("Sign in")
                  : t("Create buyer account")}
            </button>
          </form>

          <div className="mt-6 rounded-2xl bg-surface-2 p-4 text-sm text-muted">
            {mode === "login" ? (
              <>
                {t("Don’t have an account?")}{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="font-semibold text-link hover:text-blue-800"
                >
                  {t("Create one")}
                </button>
              </>
            ) : (
              <>
                {t("Already have an account?")}{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-semibold text-link hover:text-blue-800"
                >
                  {t("Sign in")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
