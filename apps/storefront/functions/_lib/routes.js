// The storefront's pages (same list as <Routes> in src/App.jsx; a test in
// workers/api/test/storefront-routes.test.mjs keeps them in sync). Any
// other address is a 404 for search engines, not the home page with 200
// (the single-page fallback): see _middleware.js.
export const ROUTES = [
  "/",
  "/parts",
  "/parts/:slug",
  "/sell",
  "/pieces/:category",
  "/voiture/:make",
  "/voiture/:make/:model",
  "/voiture/:make/:model/:category",
  "/legal",
  "/legal/:doc",
  "/vehicle-selector",
  "/cart",
  "/auth",
  "/forgot-password",
  "/reset-password",
  "/delete-account",
  "/checkout",
  "/checkout/success",
  "/compare",
  "/sellers/:slug",
  "/request-part",
  "/requests",
  "/requests/:id",
  "/account",
  "/orders",
  "/orders/:orderNumber/tracking",
];

const PATTERNS = ROUTES.map((r) => new RegExp(`^${r.replace(/:[a-zA-Z]+/g, "[^/]+")}/?$`));

export function isKnownPage(path) {
  return PATTERNS.some((re) => re.test(path));
}
