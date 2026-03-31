import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function getRedirectPath(location) {
  const params = new URLSearchParams(location.search);
  return params.get("redirect") || "/";
}

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const redirectTo = useMemo(() => getRedirectPath(location), [location]);
  const { login, loading, isAuthenticated, user } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

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
      setError("Please enter your seller email and password.");
      return;
    }

    try {
      await login(form.email.trim(), form.password);
      navigate(redirectTo);
    } catch (err) {
      setError(err?.message || "Seller sign-in failed.");
    }
  }

  if (isAuthenticated) {
    return (
      <section className="space-y-6">
        <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              Seller auth
            </div>
            <h1 className="text-3xl font-bold sm:text-5xl">You are already signed in</h1>
            <p className="mt-3 text-sm text-blue-100 sm:text-base">
              Continue to your dashboard, inventory, or orders.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">Email</p>
              <p className="mt-1 font-semibold text-gray-900">{user?.email || "Seller account"}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">Role</p>
              <p className="mt-1 font-semibold text-gray-900">{user?.role || "seller"}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={redirectTo}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Continue
            </Link>
            <Link
              to="/parts"
              className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              Inventory
            </Link>
            <Link
              to="/orders"
              className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              Orders
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
            Seller auth foundation
          </div>
          <h1 className="text-3xl font-bold sm:text-5xl">Sign in to seller portal</h1>
          <p className="mt-3 text-sm text-blue-100 sm:text-base">
            Access your dashboard, inventory, orders, media tools, and store settings.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Seller workflow</h2>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="rounded-2xl bg-gray-50 p-4">Manage your inventory from one place.</div>
              <div className="rounded-2xl bg-gray-50 p-4">Upload media and attach images to parts.</div>
              <div className="rounded-2xl bg-gray-50 p-4">Review orders and store settings.</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900">Seller sign in</h2>
          <p className="mt-2 text-sm text-gray-500">
            Use your seller account credentials to continue.
          </p>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Email
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
                Password
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
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
