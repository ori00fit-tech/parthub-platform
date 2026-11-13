import { noteDeletionCancelled } from "@parthub/shared/account";
import { createContext, useContext, useState, useEffect } from "react";
import { api, BASE_URL } from "../lib/api";
import { SELLER_TOKEN_KEY } from "@parthub/shared";

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
    noteDeletionCancelled(res.data);
  }

  // Seller sign-up: create the account as a seller, then sign in.
  async function register({ name, email, phone, password }) {
    // The sign-up form shows the terms notice.
    await api.post("/api/v1/auth/register", { name, email, phone, password, role: "seller", accept_terms: true });
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
    revokeOnServer(BASE_URL, localStorage.getItem(SELLER_TOKEN_KEY));
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
