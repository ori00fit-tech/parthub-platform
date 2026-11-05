import { Link } from "react-router-dom";
import { useT } from "../i18n";
import { Icon } from "@parthub/shared/icons";

export default function NotFoundPage() {
  const t = useT();
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-gray-800 bg-gray-900 p-10 text-center shadow-sm">
        <Icon name="compass" className="mx-auto mb-4 h-14 w-14 text-gray-500" />
        <h1 className="text-3xl font-bold text-gray-100">{t("Page not found")}</h1>
        <p className="mt-2 text-sm text-gray-400">
          {t("This page does not exist.")}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            {t("Go to dashboard")}
          </Link>
          <Link
            to="/sellers"
            className="rounded-2xl border border-gray-700 bg-gray-950 px-5 py-3 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
          >
            {t("Sellers")}
          </Link>
          <Link
            to="/parts"
            className="rounded-2xl border border-gray-700 bg-gray-950 px-5 py-3 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
          >
            {t("Parts")}
          </Link>
        </div>
      </div>
    </section>
  );
}
