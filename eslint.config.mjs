// ESLint (flat config) for the whole repo: `pnpm lint` runs it in each
// package (turbo). Errors = likely bugs (undefined names, unreachable code,
// hooks called conditionally...) and fail CI; style and unused code are
// warnings only.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

const quality = {
  "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_", caughtErrors: "none", ignoreRestSiblings: true }],
  "no-empty": ["warn", { allowEmptyCatch: true }],
  "no-useless-escape": "warn",
  "no-control-regex": "off",
  "no-misleading-character-class": "off",
  "no-irregular-whitespace": "warn",
  "no-case-declarations": "warn",
  "no-prototype-builtins": "warn",
};

export default [
  { ignores: ["**/node_modules/**", "**/dist/**", "**/.build/**", "**/.wrangler/**", "**/.turbo/**"] },

  // API worker (TypeScript)
  ...tseslint.configs.recommended.map((c) => ({ ...c, files: ["workers/api/src/**/*.ts"] })),
  {
    files: ["workers/api/src/**/*.ts"],
    languageOptions: { globals: { ...globals.worker } },
    rules: {
      ...quality,
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_", caughtErrors: "none", ignoreRestSiblings: true }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },

  // The three web apps and the shared package (React, JS/JSX)
  {
    files: ["apps/*/src/**/*.{js,jsx}", "packages/shared/src/**/*.{js,jsx}"],
    ...js.configs.recommended,
    plugins: { react, "react-hooks": reactHooks },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.es2024 },
    },
    settings: { react: { version: "18" } },
    rules: {
      ...js.configs.recommended.rules,
      ...quality,
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "off",
      "react/jsx-key": "warn",
      "react/jsx-no-undef": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // Cloudflare Pages Functions of the storefront
  {
    files: ["apps/storefront/functions/**/*.js"],
    ...js.configs.recommended,
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: { ...globals.worker, HTMLRewriter: "readonly" } },
    rules: { ...js.configs.recommended.rules, ...quality },
  },
];
