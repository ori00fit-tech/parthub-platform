import { LANGUAGES, useI18n } from "../../i18n";

// Compact AR / FR / EN toggle for the top utility strip.
export default function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="group" aria-label={t("Language")} className="flex items-center gap-0.5 rounded-md border border-white/15 p-0.5">
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
              "min-w-[30px] rounded px-1.5 py-0.5 text-[12px] font-semibold transition",
              active ? "bg-white text-navy-deep" : "text-[#A9B4C8] hover:text-white",
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
