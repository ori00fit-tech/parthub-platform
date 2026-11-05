import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiDelete, apiGet, apiPost } from "../../lib/api";
import { useT } from "../../i18n";
import { Icon } from "@parthub/shared/icons";

// "Notify me when back in stock" for an out-of-stock part.
// Signed-out buyers are sent to sign in and come back to the part.
export default function NotifyWhenAvailable({ part, compact = false }) {
  const t = useT();
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState({ loading: isAuthenticated, following: false, busy: false, error: "" });

  useEffect(() => {
    if (!isAuthenticated || !part?.id) {
      setState((s) => ({ ...s, loading: false, following: false }));
      return undefined;
    }
    let active = true;
    apiGet("/api/v1/stock-alerts/mine", { part_id: part.id }, { auth: true })
      .then((res) => {
        if (!active) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        setState((s) => ({ ...s, loading: false, following: rows.some((r) => r.status === "active") }));
      })
      .catch(() => active && setState((s) => ({ ...s, loading: false })));
    return () => {
      active = false;
    };
  }, [isAuthenticated, part?.id]);

  async function follow() {
    setState((s) => ({ ...s, busy: true, error: "" }));
    try {
      await apiPost("/api/v1/stock-alerts", { part_id: part.id }, { auth: true });
      setState((s) => ({ ...s, busy: false, following: true }));
    } catch (err) {
      setState((s) => ({ ...s, busy: false, error: err?.message || t("Something went wrong. Please try again.") }));
    }
  }

  async function unfollow() {
    setState((s) => ({ ...s, busy: true, error: "" }));
    try {
      await apiDelete(`/api/v1/stock-alerts/${part.id}`, { auth: true });
      setState((s) => ({ ...s, busy: false, following: false }));
    } catch (err) {
      setState((s) => ({ ...s, busy: false, error: err?.message || t("Something went wrong. Please try again.") }));
    }
  }

  const btn = compact ? "h-11 px-5" : "h-12 w-full px-6";

  return (
    <div id="notify" className={compact ? "" : "rounded-2xl border border-line bg-surface-2 p-4"}>
      {!compact ? (
        <>
          <p className="font-semibold text-ink">{t("This part is out of stock")}</p>
          <p className="mt-1 text-sm text-muted">
            {t("We'll let you know as soon as the seller restocks it. Your alerts are in My Account.")}
          </p>
        </>
      ) : null}

      <div className={compact ? "" : "mt-3"}>
        {!isAuthenticated ? (
          <Link
            to={`/auth?redirect=${encodeURIComponent(`/parts/${part.slug}#notify`)}`}
            className={`btn-cta ${btn} rounded-2xl text-sm`}
          >
            {t("Notify me when it's back")}
          </Link>
        ) : state.following ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-11 items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-4 text-sm font-semibold text-emerald-800" role="status">
              <Icon name="ok" className="h-4 w-4" /> {t("We'll notify you")}
            </span>
            <button
              type="button"
              onClick={unfollow}
              disabled={state.busy}
              className="text-sm font-semibold text-link underline underline-offset-2 disabled:opacity-60"
            >
              {t("Stop alerts")}
            </button>
          </div>
        ) : (
          <button type="button" onClick={follow} disabled={state.busy || state.loading} className={`btn-cta ${btn} rounded-2xl text-sm`}>
            {state.busy ? t("Saving…") : t("Notify me when it's back")}
          </button>
        )}
        {state.error ? (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
