import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import ar from "./ar";
import fr from "./fr";

// Storefront translations. Keys are the English source text, so anything not
// translated yet simply shows in English. Placeholders: t("{n} results", { n }).
export const LANGUAGES = [
  { code: "ar", label: "العربية", short: "ع", dir: "rtl" },
  { code: "fr", label: "Français", short: "FR", dir: "ltr" },
  { code: "en", label: "English", short: "EN", dir: "ltr" },
];

const DICTIONARIES = { ar, fr, en: {} };
const STORAGE_KEY = "parthub_lang";

function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DICTIONARIES[saved]) return saved;
  } catch {
    // ignore
  }
  const browser = (typeof navigator !== "undefined" && (navigator.languages?.[0] || navigator.language)) || "";
  const code = browser.slice(0, 2).toLowerCase();
  return DICTIONARIES[code] ? code : "fr"; // Moroccan default
}

export function translate(lang, text, vars) {
  const dict = DICTIONARIES[lang] || {};
  let out = dict[text] ?? text;
  if (vars) {
    out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m));
  }
  return out;
}

// Module-level translator for helpers outside components. Helpers only run
// while a component that uses useT() renders, so this stays in step.
let currentLang = "en";
export function t(text, vars) {
  return translate(currentLang, text, vars);
}

// Stored part conditions (new / used / refurbished) shown in the buyer's language.
const CONDITION_LABELS = { new: "New", used: "Used", refurbished: "Refurbished" };
export function conditionLabel(value) {
  if (!value) return "";
  const key = CONDITION_LABELS[String(value).toLowerCase()];
  return key ? t(key) : value;
}

const I18nContext = createContext({ lang: "en", dir: "ltr", t: (s, v) => translate("en", s, v), setLang: () => {} });

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLanguage);
  const meta = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[2];
  currentLang = lang;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = meta.dir;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, [lang, meta.dir]);

  const setLang = useCallback((code) => {
    if (DICTIONARIES[code]) setLangState(code);
  }, []);

  const value = useMemo(
    () => ({ lang, dir: meta.dir, t: (text, vars) => translate(lang, text, vars), setLang }),
    [lang, meta.dir, setLang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

// Shorthand for components: const t = useT();
export function useT() {
  return useContext(I18nContext).t;
}
