import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { LEGAL_DOC_IDS, LEGAL_VERSION, legalDoc, legalText } from "@parthub/shared/legal";
import { dateLocale, useI18n } from "../i18n";

// Terms of use, seller agreement, returns policy and privacy policy
// (/legal/terms, /legal/seller, /legal/returns, /legal/privacy).
// The texts live in @parthub/shared/legal, in the three languages.

function versionDate() {
  const d = new Date(`${LEGAL_VERSION}T00:00:00Z`);
  return d.toLocaleDateString(dateLocale(), { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

function Section({ section, index }) {
  return (
    <section className="border-t border-line pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-bold text-ink">
        <span className="me-2 font-mono text-sm text-faint">{index + 1}.</span>
        {section.title}
      </h2>
      {section.paragraphs?.map((p) => (
        <p key={p} className="mt-3 text-sm leading-7 text-ink-2">{legalText(p)}</p>
      ))}
      {section.items ? (
        <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-7 text-ink-2 marker:text-faint">
          {section.items.map((item) => (
            <li key={item}>{legalText(item)}</li>
          ))}
        </ul>
      ) : null}
      {section.steps ? (
        <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm leading-7 text-ink-2 marker:font-semibold marker:text-link">
          {section.steps.map((step) => (
            <li key={step}>{legalText(step)}</li>
          ))}
        </ol>
      ) : null}
      {section.table ? (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-start text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <tr>
                {section.table.head.map((h) => (
                  <th key={h} scope="col" className="px-4 py-2.5 text-start font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {section.table.rows.map((row) => (
                <tr key={row.join("|")}>
                  {row.map((cell, i) => (
                    <td key={cell + i} className={i === row.length - 1 ? "whitespace-nowrap px-4 py-2.5 font-semibold text-ink" : "px-4 py-2.5 text-ink-2"}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {section.after?.map((p) => (
        <p key={p} className="mt-3 text-sm leading-7 text-ink-2">{legalText(p)}</p>
      ))}
    </section>
  );
}

export default function LegalPage() {
  const { doc: id = "terms" } = useParams();
  const { lang, t } = useI18n();
  const doc = LEGAL_DOC_IDS.includes(id) ? legalDoc(id, lang) : null;

  useEffect(() => {
    if (!doc) return undefined;
    const previous = document.title;
    document.title = `${doc.title} · PartHub`;
    return () => {
      document.title = previous;
    };
  }, [doc]);

  if (!doc) return <Navigate to="/legal/terms" replace />;

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[220px_1fr]">
      <nav aria-label={t("Policies")} className="lg:sticky lg:top-28 lg:self-start">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-faint">{t("Policies")}</p>
        <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1">
          {LEGAL_DOC_IDS.map((key) => (
            <li key={key} className="flex-none">
              <Link
                to={`/legal/${key}`}
                aria-current={key === id ? "page" : undefined}
                className={[
                  "block rounded-xl px-3 py-2 text-sm font-semibold transition",
                  key === id ? "bg-surface-2 text-link" : "text-ink-2 hover:bg-surface-2",
                ].join(" ")}
              >
                {legalDoc(key, lang).title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <article className="rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold text-ink">{doc.title}</h1>
        <p className="mt-2 text-sm text-muted">{doc.summary}</p>
        <p className="mt-1 text-xs text-faint">{t("Version of {date}", { date: versionDate() })}</p>
        <div className="mt-8 space-y-6">
          {doc.sections.map((section, i) => (
            <Section key={section.title} section={section} index={i} />
          ))}
        </div>
      </article>
    </div>
  );
}
