import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "buyer" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit() {
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
        navigate("/");
      } else {
        await register(form);
        setMode("login");
        setError("Account created. Please log in.");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="container-app py-16 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {mode === "login" ? "Sign in to PartHub" : "Create your account"}
      </h1>
      <p className="text-gray-500 text-sm mb-8">
        {mode === "login" ? (
          <>Don't have an account? <button onClick={() => setMode("register")} className="text-blue-600 hover:underline">Sign up</button></>
        ) : (
          <>Already have an account? <button onClick={() => setMode("login")} className="text-blue-600 hover:underline">Sign in</button></>
        )}
      </p>

      <div className="space-y-4">
        {mode === "register" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input value={form.name} onChange={set("name")} placeholder="John Doe" className={inputCls} />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={form.email} onChange={set("email")} placeholder="you@email.com" className={inputCls} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input type="password" value={form.password} onChange={set("password")} placeholder="••••••••" className={inputCls} />
        </div>

        {mode === "register" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
            <select value={form.role} onChange={set("role")} className={inputCls}>
              <option value="buyer">Buyer – I want to buy parts</option>
              <option value="seller">Seller – I want to sell parts</option>
            </select>
          </div>
        )}

        {error && (
          <p className={`text-sm px-3 py-2 rounded ${error.includes("created") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {error}
          </p>
        )}

        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>
      </div>

      {mode === "register" && form.role === "seller" && (
        <p className="text-xs text-gray-400 mt-4 text-center">
          After creating your account, go to{" "}
          <a href="https://seller.parthub.site" className="text-blue-600 hover:underline">seller.parthub.site</a>{" "}
          to set up your store.
        </p>
      )}
    </div>
  );
}
