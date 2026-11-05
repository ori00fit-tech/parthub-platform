import { LANGUAGES, useI18n } from "../../i18n";

// AR / FR / EN toggle.
export default function LanguageSwitcher({ className = "" }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="group" aria-label={t("Language")} className={["flex items-center gap-0.5 rounded-xl border border-gray-700 bg-gray-900 p-0.5", className].join(" ")}>
      {LANGUAGES.map((l) => {
        const active = l.code === lang;
        return (
          <button
            key={l.code}
            type="button"
            lang={l.code}
            onClick={() => setLang(l.code)}
            aria-pressed={active}
            title={l.label}
            className={[
              "min-w-[32px] rounded-lg px-2 py-1 text-xs font-semibold transition",
              active ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white",
            ].join(" ")}
          >
            <span aria-hidden="true">{l.short}</span>
            <span className="sr-only">{l.label}</span>
          </button>
        );
      })}
    </div>
  );
}
