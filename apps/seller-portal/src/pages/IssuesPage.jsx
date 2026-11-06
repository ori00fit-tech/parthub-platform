import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useT } from "../i18n";
import IssueCard from "../components/issues/IssueCard";

// Returns and complaints on the seller's parts.
export default function IssuesPage() {
  const t = useT();
  const [all, setAll] = useState(false);
  const [state, setState] = useState({ loading: true, error: "", items: [] });

  const load = useCallback(() => {
    return api
      .get(`/api/v1/marketplace/me/issues${all ? "?status=all" : ""}`)
      .then((res) => setState({ loading: false, error: "", items: res?.data?.items || [] }))
      .catch((err) => setState({ loading: false, error: err?.message || t("Something went wrong. Please try again."), items: [] }));
  }, [all]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("Returns and claims")}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("Buyers can report a problem within 7 days of delivery.")}{" "}
            <Link to="/legal/returns" target="_blank" rel="noopener" className="font-semibold text-blue-700 hover:underline">
              {t("Returns policy")}
            </Link>
          </p>
        </div>
        <div className="flex rounded-xl border border-gray-200 bg-white p-1 text-sm font-semibold">
          <button type="button" onClick={() => setAll(false)} aria-pressed={!all} className={["rounded-lg px-3 py-1.5", !all ? "bg-blue-50 text-blue-700" : "text-gray-600"].join(" ")}>
            {t("In progress")}
          </button>
          <button type="button" onClick={() => setAll(true)} aria-pressed={all} className={["rounded-lg px-3 py-1.5", all ? "bg-blue-50 text-blue-700" : "text-gray-600"].join(" ")}>
            {t("All")}
          </button>
        </div>
      </div>

      {state.loading ? <div className="h-32 animate-pulse rounded-3xl bg-white" /> : null}
      {state.error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p> : null}
      {!state.loading && !state.error && !state.items.length ? (
        <p className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-500">
          {all ? t("No claims yet.") : t("No claim in progress.")}
        </p>
      ) : null}
      <div className="space-y-3">
        {state.items.map((issue) => (
          <IssueCard key={issue.id} issue={issue} showOrder onChange={load} />
        ))}
      </div>
    </section>
  );
}
