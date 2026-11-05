import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n";
import LanguageSwitcher from "../components/common/LanguageSwitcher";

function getRedirectPath(location) {
  const params = new URLSearchParams(location.search);
  return params.get("redirect") || "/";
}

export default function AuthPage() {
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const redirectTo = useMemo(() => getRedirectPath(location), [location]);
  const { login, register, loading, isAuthenticated, user } = useAuth();

  const [mode, setMode] = useState(() =>
    new URLSearchParams(location.search).get("mode") === "signup" ? "signup" : "signin"
  );
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isSignup = mode === "signup";

  function setField(key) {
    return (e) => {
      setError("");
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password.trim()) {
      setError(t("Please enter your email and password."));
      return;
    }
    if (isSignup && !form.name.trim()) {
      setError(t("Please enter your name."));
      return;
    }
    if (isSignup && form.password.length < 8) {
      setError(t("Use at least 8 characters for your password."));
      return;
    }

    try {
      setSubmitting(true);
      if (isSignup) {
        await register({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          password: form.password,
        });
        // New sellers go straight to creating their store.
        navigate("/store-settings?welcome=1");
      } else {
        await login(form.email.trim(), form.password);
        navigate(redirectTo);
      }
    } catch (err) {
      setError(err?.message || (isSignup ? t("Could not create your account.") : t("Seller sign-in failed.")));
    } finally {
      setSubmitting(false);
    }
  }

  if (isAuthenticated) {
    return (
      <section className="space-y-6">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              {t("Seller auth")}
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">{t("You are already signed in")}</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              {t("Continue to your dashboard, inventory, or orders.")}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">{t("Email")}</p>
              <p className="mt-1 font-semibold text-gray-900">{user?.email || t("Seller account")}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">{t("Role")}</p>
              <p className="mt-1 font-semibold text-gray-900">{user?.role || "seller"}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={redirectTo}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {t("Continue")}
            </Link>
            <Link
              to="/parts"
              className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              {t("Inventory")}
            </Link>
            <Link
              to="/orders"
              className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              {t("Orders")}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
            {t("Seller account")}
          </div>
          <h1 className="text-3xl font-bold sm:text-5xl">{isSignup ? t("Sell your parts on PartHub") : t("Sign in to seller portal")}</h1>
          <p className="mt-3 text-sm text-blue-100 sm:text-base">
            {isSignup
              ? t("Create a free seller account, set up your store in a few minutes, and start answering buyer requests.")
              : t("Access your dashboard, inventory, orders, media tools, and store settings.")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">{t("Seller workflow")}</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="rounded-2xl bg-gray-50 p-4">{t("Manage your inventory from one place.")}</div>
              <div className="rounded-2xl bg-gray-50 p-4">{t("Upload media and attach images to parts.")}</div>
              <div className="rounded-2xl bg-gray-50 p-4">{t("Review orders and store settings.")}</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-gray-100 p-1" role="tablist">
            {[
              ["signin", t("Sign in")],
              ["signup", t("Create seller account")],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => {
                  setMode(value);
                  setError("");
                }}
                className={[
                  "h-10 rounded-xl text-sm font-semibold transition",
                  mode === value ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-900",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">{isSignup ? t("Create your seller account") : t("Seller sign in")}</h2>
          <p className="mt-2 text-sm text-gray-500">
            {isSignup
              ? t("Next you'll set up your store. PartHub reviews new stores before their parts go live.")
              : t("Use your seller account credentials to continue.")}
          </p>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignup ? (
              <>
                <div>
                  <label htmlFor="signup-name" className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t("Your name")}
                  </label>
                  <input
                    id="signup-name"
                    value={form.name}
                    onChange={setField("name")}
                    autoComplete="name"
                    placeholder={t("Youssef Benali")}
                    className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="signup-phone" className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t("Phone (optional)")}
                  </label>
                  <input
                    id="signup-phone"
                    value={form.phone}
                    onChange={setField("phone")}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="06 12 34 56 78"
                    className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>
              </>
            ) : null}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("Email")}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={setField("email")}
                placeholder="seller@example.com"
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("Password")}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={setField("password")}
                placeholder="••••••••"
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || submitting}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {submitting ? (isSignup ? t("Creating account…") : t("Signing in…")) : isSignup ? t("Create account") : t("Sign in")}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
