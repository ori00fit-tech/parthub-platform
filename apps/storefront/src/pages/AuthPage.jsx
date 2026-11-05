import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useCart } from "../features/cart/CartContext";
import { useT } from "../i18n";
import { Icon } from "@parthub/shared/icons";

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
    phone: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
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

      if (form.password.length < 8) {
        setError(t("Use at least 8 characters for your password."));
        return;
      }

      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });

      // Signed in straight away: no second form to fill.
      await login(form.email.trim(), form.password);
      navigate(redirectTo);
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
              {t("Buyer account")}
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">
              {mode === "login" ? t("Sign in to continue") : t("Create your buyer account")}
            </h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              {mode === "login"
                ? t("Sign in to check out, follow your orders and get offers on your part requests.")
                : t("A free account lets you order, follow your orders and request parts from sellers.")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm">
              <span className="flex items-start gap-2"><Icon name="ok" className="mt-0.5 h-4 w-4 flex-none text-emerald-300" />{t("Free, no subscription")}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm">
              <span className="flex items-start gap-2"><Icon name="ok" className="mt-0.5 h-4 w-4 flex-none text-emerald-300" />{t("Your phone is only shared with sellers you choose")}</span>
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
                {t("Place orders and see their status.")}
              </div>
              <div className="rounded-2xl bg-surface-2 p-4">
                {t("Request a part and compare sellers' offers.")}
              </div>
              <div className="rounded-2xl bg-surface-2 p-4">
                {t("Sellers reply to your requests with offers.")}
              </div>
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
                  autoComplete="name"
                  placeholder={t("John Doe")}
                  className={inputCls}
                />
              </div>
            ) : null}

            {mode === "register" ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-2">
                  {t("Phone (optional)")}
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  value={form.phone}
                  onChange={setField("phone")}
                  placeholder="06 12 34 56 78"
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-muted">{t("Saves time at checkout. Only shared with sellers you order from.")}</p>
              </div>
            ) : null}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-2">
                {t("Email")}
              </label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                dir="ltr"
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
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={form.password}
                  onChange={setField("password")}
                  placeholder={mode === "login" ? "••••••••" : t("At least 8 characters")}
                  className={`${inputCls} pe-20`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 end-2 my-auto h-8 rounded-lg px-2.5 text-xs font-semibold text-link hover:bg-surface-3"
                >
                  {showPassword ? t("Hide") : t("Show")}
                </button>
              </div>
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
