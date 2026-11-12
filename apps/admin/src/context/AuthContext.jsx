import { createContext, useContext, useState, useEffect } from "react";
import { api, BASE_URL } from "../lib/api";
import { ADMIN_TOKEN_KEY } from "@parthub/shared";

// Ends the session on the server too (every device of this account), then
// forgets it here. Best effort: signing out works offline.
function revokeOnServer(baseUrl, token) {
  if (!token) return;
  fetch(`${baseUrl}/api/v1/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, keepalive: true }).catch(() => {});
}

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
    // Signed in with a password that would be refused today: show a warning
    // on every page until it is changed (AdminLayout, AccountPage).
    try {
      if (res.data.password_weak) localStorage.setItem("ph_admin_password_weak", "1");
      else localStorage.removeItem("ph_admin_password_weak");
    } catch {
      // ignore
    }
    setUser(res.data.user);
  }

  function logout() {
    revokeOnServer(BASE_URL, localStorage.getItem(ADMIN_TOKEN_KEY));
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
