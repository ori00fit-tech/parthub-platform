import { useEffect } from "react";
import { Link } from "react-router-dom";
import { LEGAL_CONTACT_EMAIL } from "@parthub/shared/legal";
import { helpFor } from "../content/help";
import { useI18n } from "../i18n";

// /help — questions buyers and sellers ask, in their language. The texts are
// in content/help.js (also used for search engines by functions/help.js).

// Where each section's answers lead (labels are translated with t()).
const LINKS = {
  order: [["/vehicle-selector", "Choose my vehicle"], ["/request-part", "Request a part"]],
  pay: [["/cart", "My cart"]],
  track: [["/orders", "My orders"]],
  returns: [["/orders", "My orders"], ["/legal/returns", "Returns policy"]],
  trust: [["/parts", "Browse parts"]],
  account: [["/forgot-password", "Forgot password"], ["/delete-account", "Delete my account"]],
  sell: [["/sell", "Sell on PartHub"], ["/legal/seller", "Seller agreement"]],
};

export default function HelpPage() {
  const { lang, t } = useI18n();
  const help = helpFor(lang);

  useEffect(() => {
    document.title = `${help.title} | PartHub`;
  }, [help.title]);

  return (
    <section className="mx-auto max-w-4xl space-y-8 pb-16">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">{help.title}</h1>
        <p className="text-base text-muted">{help.intro}</p>
        <nav aria-label={help.title} className="flex flex-wrap gap-2 pt-2">
          {help.sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink-2 hover:border-line-strong">
              {s.title}
            </a>
          ))}
        </nav>
      </header>

      {help.sections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-24 rounded-3xl border border-line bg-surface p-5 sm:p-6">
          <h2 className="text-xl font-bold text-ink">{section.title}</h2>
          <div className="mt-4 divide-y divide-line">
            {section.items.map((item) => (
              <details key={item.q} className="group py-3">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-semibold text-ink">
                  <span>{item.q}</span>
                  <span aria-hidden="true" className="text-faint transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm leading-7 text-ink-2">{item.a}</p>
              </details>
            ))}
          </div>
          {LINKS[section.id] ? (
            <div className="mt-4 flex flex-wrap gap-3">
              {LINKS[section.id].map(([to, label]) => (
                <Link key={to + label} to={to} className="text-sm font-semibold text-link hover:underline">
                  {t(label)}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ))}

      <p className="text-sm text-muted">
        {help.contact}{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} dir="ltr" className="font-semibold text-link hover:underline">{LEGAL_CONTACT_EMAIL}</a>
      </p>
    </section>
  );
}
