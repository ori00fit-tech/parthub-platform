import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiDelete, apiGet, apiPut } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useT } from "../../i18n";

// Saved parts (API: /api/v1/favorites, on the account: every device).
// A visitor who is not signed in is sent to sign in first, then back here.
const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [ids, setIds] = useState(() => new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      setIds(new Set());
      return;
    }
    apiGet("/api/v1/favorites/ids", undefined, { auth: true })
      .then((r) => setIds(new Set(Array.isArray(r?.data) ? r.data : [])))
      .catch(() => undefined);
  }, [isAuthenticated]);

  const set = useCallback(async (partId, saved) => {
    const id = Number(partId);
    setIds((prev) => {
      const next = new Set(prev);
      if (saved) next.add(id);
      else next.delete(id);
      return next;
    });
    try {
      if (saved) await apiPut(`/api/v1/favorites/${id}`, undefined, { auth: true });
      else await apiDelete(`/api/v1/favorites/${id}`, { auth: true });
    } catch (err) {
      // Put it back as it was.
      setIds((prev) => {
        const next = new Set(prev);
        if (saved) next.delete(id);
        else next.add(id);
        return next;
      });
      throw err;
    }
  }, []);

  const value = useMemo(() => ({ ids, isSaved: (id) => ids.has(Number(id)), set, count: ids.size }), [ids, set]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  return useContext(FavoritesContext);
}

// The ♥ button. Not signed in: sign in first, then come back.
export function FavoriteButton({ partId, className = "", withLabel = false }) {
  const t = useT();
  const fav = useFavorites();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  if (!fav) return null;
  const saved = fav.isSaved(partId);
  const label = saved ? t("Remove from saved parts") : t("Save this part");

  async function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    setError("");
    try {
      await fav.set(partId, !saved);
    } catch (err) {
      setError(err?.message || t("Something went wrong. Please try again."));
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      title={error || label}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition ${saved ? "border-rose-300 bg-rose-50 text-rose-700" : "border-line bg-surface text-ink-2 hover:border-rose-300 hover:text-rose-700"} ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
      {withLabel ? <span>{saved ? t("Saved") : t("Save")}</span> : null}
    </button>
  );
}
