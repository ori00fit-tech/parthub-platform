import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// A link to another page opens it at the top (the browser does not do it
// for a single-page site). Back / forward keep the browser's own position;
// a link with #anchor goes to that anchor; filters that only change the
// query string (?…) do not jump.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  useLayoutEffect(() => {
    if (navigationType === "POP") return;
    if (hash) {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) { el.scrollIntoView(); return; }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash, navigationType]);
  return null;
}
