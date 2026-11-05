import { Link } from "react-router-dom";
import { useT } from "../i18n";

export default function NotFoundPage() {
  const t = useT();
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <div className="text-5xl">🧭</div>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">{t("Page not found")}</h1>
        <p className="mt-2 text-sm text-gray-500">
          {t("This page does not exist.")}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {t("Go to dashboard")}
          </Link>
          <Link
            to="/parts"
            className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
          >
            {t("Inventory")}
          </Link>
        </div>
      </div>
    </section>
  );
}
