import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../../lib/api";
import { STOREFRONT_TOKEN_KEY } from "@parthub/shared";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(STOREFRONT_TOKEN_KEY);
    if (!token) { setLoading(false); return; }

    api.get("/api/v1/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem(STOREFRONT_TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await api.post("/api/v1/auth/login", { email, password });
    localStorage.setItem(STOREFRONT_TOKEN_KEY, res.data.access_token);
    setUser(res.data.user);
    return res.data;
  }

  async function register(payload) {
    const res = await api.post("/api/v1/auth/register", payload);
    return res.data;
  }

  function logout() {
    localStorage.removeItem(STOREFRONT_TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
