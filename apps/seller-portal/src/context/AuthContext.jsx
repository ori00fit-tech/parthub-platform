import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../lib/api";
import { SELLER_TOKEN_KEY } from "@parthub/shared";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(SELLER_TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    api.get("/api/v1/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => localStorage.removeItem(SELLER_TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await api.post("/api/v1/auth/login", { email, password });
    if (res.data.user.role !== "seller") throw new Error("Not a seller account");
    localStorage.setItem(SELLER_TOKEN_KEY, res.data.access_token);
    setUser(res.data.user);
  }

  // Seller sign-up: create the account as a seller, then sign in.
  async function register({ name, email, phone, password }) {
    await api.post("/api/v1/auth/register", { name, email, phone, password, role: "seller" });
    await login(email, password);
  }

  // The API hands out a new token when the store is created (it carries the
  // seller id). The API client reads the token from storage on every call.
  function setSessionToken(token) {
    if (!token) return;
    try {
      localStorage.setItem(SELLER_TOKEN_KEY, token);
    } catch {
      // ignore
    }
  }

  function logout() {
    localStorage.removeItem(SELLER_TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, setSessionToken, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
