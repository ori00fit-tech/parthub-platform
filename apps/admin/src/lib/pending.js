import { useEffect, useState } from "react";
import { api } from "./api";

// Counts of what waits for moderation, for the sidebar badges.
// Pages call notifyPendingChanged() after approving/rejecting so the badges
// update at once; otherwise they refresh on navigation and every minute.
const EVENT = "admin:pending-changed";

export function notifyPendingChanged() {
  window.dispatchEvent(new Event(EVENT));
}

export function usePendingCounts(pathname) {
  const [counts, setCounts] = useState({ sellers: 0, parts: 0, reviews: 0 });

  useEffect(() => {
    let active = true;
    const load = () =>
      api
        .get("/api/v1/admin/pending-counts")
        .then((res) => active && res?.data && setCounts(res.data))
        .catch(() => {});
    load();
    const timer = setInterval(load, 60000);
    window.addEventListener(EVENT, load);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener(EVENT, load);
    };
  }, [pathname]);

  return counts;
}
