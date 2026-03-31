import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../lib/api";

const TOKEN_KEY = "parthub_buyer_token";
const USER_KEY = "parthub_buyer_user";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function persistSession(token, user) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);

    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readStoredToken());
  const [user, setUser] = useState(() => readStoredUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    persistSession(token, user);
  }, [token, user]);

  async function login(email, password) {
    setLoading(true);
    try {
      const res = await apiPost("/api/v1/auth/login", {
        email,
        password,
        role: "buyer",
      });

      const nextToken =
        res?.data?.token ||
        res?.data?.access_token ||
        res?.token ||
        "";

      const nextUser =
        res?.data?.user ||
        res?.user ||
        {
          email,
          role: "buyer",
        };

      setToken(nextToken);
      setUser(nextUser);
      return res;
    } finally {
      setLoading(false);
    }
  }

  async function register(form) {
    setLoading(true);
    try {
      return await apiPost("/api/v1/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
        role: "buyer",
      });
    } finally {
      setLoading(false);
    }
  }

  async function refreshMe() {
    if (!token) return null;

    try {
      const res = await apiGet("/api/v1/auth/me", undefined, { auth: true });
      const nextUser = res?.data || res?.user || null;
      if (nextUser) setUser(nextUser);
      return nextUser;
    } catch {
      return null;
    }
  }

  function logout() {
    setToken("");
    setUser(null);
  }

  const value = useMemo(() => {
    return {
      token,
      user,
      loading,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
      refreshMe,
    };
  }, [token, user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
