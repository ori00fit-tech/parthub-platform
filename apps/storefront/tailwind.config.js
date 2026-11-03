/** @type {import('tailwindcss').Config} */
// PartHub "industrial" theme: deep charcoal & slate surfaces, navy for structure
// and trust, Safety Orange reserved for conversion buttons (Add to cart,
// Checkout, Verify fitment, Send request). See src/styles/globals.css.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0F172A", // page background
        surface: { DEFAULT: "#1E293B", 2: "#162033", 3: "#223049" }, // cards, wells, hover
        line: { DEFAULT: "#2C3A51", strong: "#3B4B66" },
        ink: { DEFAULT: "#F8FAFC", 2: "#CBD5E1" }, // primary / secondary text
        muted: "#94A3B8",
        faint: "#7E8DA6",
        link: "#93C5FD",
        navy: { DEFAULT: "#1E40AF", deep: "#172F7E", ink: "#DBE4FF", night: "#0E1B3D" },
        cta: { DEFAULT: "#F97316", hover: "#FB8A3C", ink: "#1A0E05" },
        brand: { 600: "#1E40AF", 700: "#172F7E" },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
        display: ['"Barlow Condensed"', '"Arial Narrow"', '"Roboto Condensed"', "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 rgba(255,255,255,.04) inset, 0 10px 30px -12px rgba(0,0,0,.6)",
        lift: "0 1px 0 rgba(255,255,255,.05) inset, 0 18px 36px -16px rgba(0,0,0,.75)",
        cta: "0 6px 18px -8px rgba(249,115,22,.7)",
      },
    },
  },
  plugins: [],
};
