import { Fragment } from "react";
import { Link } from "react-router-dom";
import { LEGAL_VERSION, legalText } from "@parthub/shared/legal";
import { dateLocale } from "../../i18n";

// Renders one PartHub legal text from @parthub/shared/legal.

export function legalVersionDate() {
  const d = new Date(`${LEGAL_VERSION}T00:00:00Z`);
  return d.toLocaleDateString(dateLocale(), { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

// A translated sentence whose [bracketed] parts become links, in order.
export function LinkedText({ text, links }) {
  let n = 0;
  return text.split(/(\[[^\]]+\])/).map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]$/);
    if (!m) return <Fragment key={i}>{part}</Fragment>;
    const to = links[n++];
    return to ? (
      <Link key={i} to={to} target="_blank" rel="noopener" className="font-semibold text-blue-700 hover:underline">
        {m[1]}
      </Link>
    ) : (
      <Fragment key={i}>{m[1]}</Fragment>
    );
  });
}

const text = "text-sm leading-7 text-gray-700";

export default function LegalDocument({ doc }) {
  return (
    <div className="space-y-6">
      {doc.sections.map((section, index) => (
        <section key={section.title} className="border-t border-gray-100 pt-6 first:border-t-0 first:pt-0">
          <h2 className="text-lg font-bold text-gray-900">
            <span className="me-2 font-mono text-sm text-gray-400">{index + 1}.</span>
            {section.title}
          </h2>
          {section.paragraphs?.map((p) => (
            <p key={p} className={`mt-3 ${text}`}>{legalText(p)}</p>
          ))}
          {section.items ? (
            <ul className={`mt-3 list-disc space-y-2 ps-5 ${text}`}>
              {section.items.map((item) => (
                <li key={item}>{legalText(item)}</li>
              ))}
            </ul>
          ) : null}
          {section.steps ? (
            <ol className={`mt-3 list-decimal space-y-2 ps-5 ${text}`}>
              {section.steps.map((step) => (
                <li key={step}>{legalText(step)}</li>
              ))}
            </ol>
          ) : null}
          {section.table ? (
            <div className="mt-3 overflow-x-auto rounded-2xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    {section.table.head.map((h) => (
                      <th key={h} scope="col" className="px-4 py-2.5 text-start font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {section.table.rows.map((row) => (
                    <tr key={row.join("|")}>
                      {row.map((cell, i) => (
                        <td key={cell + i} className={i === row.length - 1 ? "whitespace-nowrap px-4 py-2.5 font-semibold text-gray-900" : "px-4 py-2.5 text-gray-700"}>
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
            <p key={p} className={`mt-3 ${text}`}>{legalText(p)}</p>
          ))}
        </section>
      ))}
    </div>
  );
}
