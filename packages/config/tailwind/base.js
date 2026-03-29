/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eef5ff",
          100: "#d9e8ff",
          200: "#bcd4ff",
          300: "#8eb6ff",
          400: "#608eff", // primary
          500: "#3d66f5",
          600: "#2748e8",
          700: "#1f38d0",
          800: "#1e31a8",
          900: "#1e2d84",
        },
        surface: {
          50:  "#f8f9fc",
          100: "#f0f2f8",
          200: "#e4e7f1",
          800: "#1c2237",
          900: "#111827",
        },
      },
      fontFamily: {
        sans: ["Inter var", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
    },
  },
  plugins: [],
};
