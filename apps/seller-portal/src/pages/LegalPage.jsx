import { Link, Navigate, useParams } from "react-router-dom";
import { LEGAL_DOC_IDS, legalDoc } from "@parthub/shared/legal";
import { useI18n } from "../i18n";
import LanguageSwitcher from "../components/common/LanguageSwitcher";
import LegalDocument, { legalVersionDate } from "../components/legal/LegalDocument";

// Public legal pages (/legal/terms, /legal/seller, /legal/returns,
// /legal/privacy), readable before signing up.
export default function LegalPage() {
  const { doc: id = "seller" } = useParams();
  const { lang, t } = useI18n();
  if (!LEGAL_DOC_IDS.includes(id)) return <Navigate to="/legal/seller" replace />;
  const doc = legalDoc(id, lang);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link to="/auth" className="text-sm font-semibold text-blue-700 hover:underline">
            <span aria-hidden="true" className="inline-block rtl:rotate-180">←</span> {t("PartHub Seller")}
          </Link>
          <LanguageSwitcher />
        </div>
        <nav aria-label={t("Policies")} className="mb-4 flex gap-2 overflow-x-auto">
          {LEGAL_DOC_IDS.map((key) => (
            <Link
              key={key}
              to={`/legal/${key}`}
              aria-current={key === id ? "page" : undefined}
              className={[
                "flex-none rounded-xl px-3 py-2 text-sm font-semibold",
                key === id ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100",
              ].join(" ")}
            >
              {legalDoc(key, lang).title}
            </Link>
          ))}
        </nav>
        <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-bold text-gray-900">{doc.title}</h1>
          <p className="mt-2 text-sm text-gray-500">{doc.summary}</p>
          <p className="mt-1 text-xs text-gray-400">{t("Version of {date}", { date: legalVersionDate() })}</p>
          <div className="mt-8">
            <LegalDocument doc={doc} />
          </div>
        </article>
      </div>
    </main>
  );
}
