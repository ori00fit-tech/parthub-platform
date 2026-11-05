import { useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
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
  const { login, isAuthenticated, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);

    try {
      if (!email.trim() || !password.trim()) {
        setError(t("Please enter your admin email and password."));
        return;
      }

      await login(email.trim(), password);
      navigate(redirectTo);
    } catch (e) {
      setError(e?.message || t("Admin sign-in failed."));
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500";

  if (isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-gray-950 px-4 py-10 text-gray-100">
        <LanguageSwitcher className="absolute end-4 top-4" />
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="overflow-hidden rounded-[28px] border border-gray-800 bg-gradient-to-br from-gray-900 via-slate-950 to-blue-950 p-8 shadow-xl">
            <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
              {t("Admin session")}
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">{t("You are already signed in")}</h1>
            <p className="mt-3 text-sm text-gray-300 sm:text-base">
              {t("Continue to the admin dashboard, moderation queues, or system overview.")}
            </p>
          </div>

          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-950 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">{t("Email")}</p>
                <p className="mt-1 font-semibold text-gray-100">{user?.email || t("Admin")}</p>
              </div>
              <div className="rounded-2xl bg-gray-950 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">{t("Role")}</p>
                <p className="mt-1 font-semibold text-gray-100">{user?.role || "admin"}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={redirectTo}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                {t("Continue")}
              </Link>
              <Link
                to="/sellers"
                className="rounded-2xl border border-gray-700 bg-gray-950 px-5 py-3 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
              >
                {t("Sellers")}
              </Link>
              <Link
                to="/parts"
                className="rounded-2xl border border-gray-700 bg-gray-950 px-5 py-3 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
              >
                {t("Parts")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-950 flex items-center justify-center px-4 py-10">
      <LanguageSwitcher className="absolute end-4 top-4" />
      <div className="w-full max-w-5xl grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[28px] border border-gray-800 bg-gradient-to-br from-gray-900 via-slate-950 to-blue-950 p-8 shadow-xl">
            <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
              {t("Admin Panel")}
            </div>
            <h1 className="text-3xl font-bold text-white sm:text-5xl">{t("Sign in to admin panel")}</h1>
            <p className="mt-3 text-sm text-gray-300 sm:text-base">
              {t("Access sellers moderation, parts review, order oversight, reviews moderation, and categories management.")}
            </p>
          </div>

          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-100">{t("Admin scope")}</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-400">
              <div className="rounded-2xl bg-gray-950 p-4">{t("Review sellers and marketplace activity.")}</div>
              <div className="rounded-2xl bg-gray-950 p-4">{t("Moderate parts, reviews, and operational flows.")}</div>
              <div className="rounded-2xl bg-gray-950 p-4">{t("Monitor categories, vehicles, and platform health.")}</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 shadow-sm">
          <div className="text-center mb-8">
            <p className="text-blue-400 font-black text-2xl mb-1">{t("PartHub")}</p>
            <p className="text-gray-500 text-sm">{t("Admin Panel")}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t("Email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@parthub.site"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">{t("Password")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputCls}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </div>

            {error ? (
              <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-xl border border-red-800/50">
                {error}
              </p>
            ) : null}

            <button
              onClick={submit}
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 text-white font-semibold py-3 transition hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? t("Signing in...") : t("Sign In")}
            </button>

            <div className="rounded-2xl bg-gray-950 p-4 text-xs text-gray-500">
              {t("Admin-only access. Non-admin accounts will be rejected during authentication.")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
