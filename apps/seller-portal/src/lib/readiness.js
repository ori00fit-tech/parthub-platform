import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { useAuth } from "../context/AuthContext";

// Store status + setup checklist from GET /api/v1/marketplace/me/readiness.
// When the API returns a fresh token (the store was created after this
// session started), it's saved so seller pages work without signing in again.
export function useReadiness() {
  const { setSessionToken } = useAuth();
  // setSessionToken is recreated on every render; keep reload() stable.
  const saveToken = useRef(setSessionToken);
  saveToken.current = setSessionToken;
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setError("");
      const res = await api.get("/api/v1/marketplace/me/readiness");
      if (res?.data?.access_token) saveToken.current(res.data.access_token);
      setReadiness(res?.data || null);
    } catch (err) {
      setError(err?.message || "Could not load your store status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { readiness, loading, error, reload };
}

export const STATUS_COPY = {
  no_store: {
    tone: "info",
    title: "Create your store to start selling",
    text: "It takes a few minutes: store name, city and a contact number.",
    cta: { label: "Create store", to: "/store-settings" },
  },
  setup: {
    tone: "info",
    title: "Finish setting up your store",
    text: "Complete the required steps below, then PartHub reviews your store.",
    cta: null,
  },
  pending_review: {
    tone: "warning",
    title: "Your store is waiting for approval",
    text: "PartHub is reviewing your store. You can keep adding parts; they go live once your store is approved.",
    cta: null,
  },
  active: {
    tone: "success",
    title: "Your store is live",
    text: "Buyers can find your parts and send you requests.",
    cta: null,
  },
  suspended: {
    tone: "danger",
    title: "Your store is suspended",
    text: "Your parts are hidden from buyers. Contact PartHub support to restore your store.",
    cta: null,
  },
  rejected: {
    tone: "danger",
    title: "Your store was not approved",
    text: "Update your store details and contact PartHub support to ask for a new review.",
    cta: { label: "Edit store", to: "/store-settings" },
  },
};
