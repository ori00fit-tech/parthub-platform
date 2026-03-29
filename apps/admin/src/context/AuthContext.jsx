import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../lib/api";
import { ADMIN_TOKEN_KEY } from "@parthub/shared";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    api.get("/api/v1/auth/me")
      .then((r) => {
        if (r.data.role !== "admin") throw new Error("Not admin");
        setUser(r.data);
      })
      .catch(() => localStorage.removeItem(ADMIN_TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await api.post("/api/v1/auth/login", { email, password });
    if (res.data.user.role !== "admin") throw new Error("Not an admin account");
    localStorage.setItem(ADMIN_TOKEN_KEY, res.data.access_token);
    setUser(res.data.user);
  }

  function logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
