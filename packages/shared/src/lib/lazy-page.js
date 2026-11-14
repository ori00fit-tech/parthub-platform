import { lazy } from "react";

// A page loaded on demand. After a release, a tab opened before it still
// asks for the old file names, which no longer exist: reload once to get
// the new ones instead of showing a blank page.
const RELOAD_KEY = "ph_chunk_reload";

export function lazyPage(load) {
  return lazy(() =>
    load().then(
      (mod) => {
        try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* ignore */ }
        return mod;
      },
      (err) => {
        let reloaded = false;
        try { reloaded = sessionStorage.getItem(RELOAD_KEY) === "1"; sessionStorage.setItem(RELOAD_KEY, "1"); } catch { reloaded = true; }
        if (!reloaded) {
          window.location.reload();
          return new Promise(() => {}); // the reload replaces the page
        }
        throw err;
      }
    )
  );
}
