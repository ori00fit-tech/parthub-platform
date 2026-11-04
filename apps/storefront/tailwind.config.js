/** @type {import('tailwindcss').Config} */
// PartHub storefront theme: light "parts counter".
// Clean light surfaces so product photos and part numbers read clearly,
// navy for structure and trust (header, badges), Safety Orange reserved for
// conversion buttons (Add to cart, Checkout, fitment search, Send request)
// via the `btn-cta` class in src/styles/globals.css.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F2F4F8", // page background (cool light gray)
        surface: { DEFAULT: "#FFFFFF", 2: "#F6F8FB", 3: "#EDF1F7" }, // cards, wells, hover
        line: { DEFAULT: "#E1E6EE", strong: "#C9D2E0" },
        ink: { DEFAULT: "#0F172A", 2: "#334155" }, // primary / secondary text
        muted: "#586477",
        faint: "#7B8698",
        link: "#1D4ED8",
        navy: { DEFAULT: "#1E40AF", deep: "#172F7E", ink: "#DBE4FF", night: "#0E1B3D" },
        cta: { DEFAULT: "#EA580C", hover: "#C2410C", ink: "#FFFFFF" },
        brand: { 600: "#1E40AF", 700: "#172F7E" },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"IBM Plex Sans Arabic"', "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
        display: ['"Barlow Condensed"', '"IBM Plex Sans Arabic"', '"Arial Narrow"', '"Roboto Condensed"', "sans-serif"],
        mono: ['"IBM Plex Mono"', '"IBM Plex Sans Arabic"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15,23,42,.05), 0 6px 18px -10px rgba(15,23,42,.14)",
        lift: "0 2px 4px rgba(15,23,42,.06), 0 18px 32px -16px rgba(15,23,42,.22)",
        cta: "0 6px 16px -8px rgba(234,88,12,.55)",
      },
    },
  },
  plugins: [],
};
