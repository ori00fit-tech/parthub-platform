import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useT } from "../i18n";

// Activity log (API: GET /api/v1/admin/audit-log, utils/audit.ts): every
// change made from the admin — who, what, on which record, the request
// (secrets removed) and whether it worked.

const TYPES = ["", "sellers", "parts", "orders", "issues", "reviews", "carriers", "invoices", "settings", "commission-rates", "whatsapp", "catalog-suggestions"];
const time = (v) => String(v || "").slice(0, 16);

function Body({ text }) {
  if (!text) return null;
  let pretty = text;
  try {
    pretty = JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    // keep as is
  }
  return <pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-gray-50 p-2 text-[11px] text-gray-700" dir="ltr">{pretty}</pre>;
}

export default function AuditLogPage() {
  const t = useT();
  const [rows, setRows] = useState(null);
  const [paging, setPaging] = useState(null);
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [targetId, setTargetId] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(0);
  const [error, setError] = useState("");

  const load = (p = page) => {
    const params = new URLSearchParams({ page: String(p), limit: "50" });
    if (type) params.set("target_type", type);
    if (targetId.trim()) params.set("target_id", targetId.trim());
    if (q.trim()) params.set("q", q.trim());
    api
      .get(`/api/v1/admin/audit-log?${params}`)
      .then((r) => {
        setRows(r?.data || []);
        setPaging(r?.pagination || null);
      })
      .catch((err) => setError(err?.message || t("Something went wrong. Please try again.")));
  };
  useEffect(() => {
    load(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="space-y-6 pb-16">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">{t("Activity log")}</h1>
        <p className="mt-3 max-w-3xl text-sm text-indigo-100 sm:text-base">
          {t("Every change made from the admin: who, what, on which record, and whether it worked. Passwords and secrets are never stored. Nobody can edit this log.")}
        </p>
      </div>
      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p> : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          load(1);
        }}
        className="flex flex-wrap items-end gap-2 rounded-3xl border border-gray-200 bg-white p-4 text-gray-900 shadow-sm"
      >
        <label className="text-xs font-semibold text-gray-700">
          {t("Record type")}
          <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 block h-10 rounded-xl border border-gray-200 bg-white px-2 text-sm">
            {TYPES.map((x) => <option key={x} value={x}>{x || t("All")}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-gray-700">
          {t("Record id")}
          <input value={targetId} onChange={(e) => setTargetId(e.target.value)} className="mt-1 block h-10 w-28 rounded-xl border border-gray-200 px-2 text-sm" dir="ltr" />
        </label>
        <label className="min-w-[10rem] flex-1 text-xs font-semibold text-gray-700">
          {t("Search")}
          <input value={q} onChange={(e) => setQ(e.target.value)} className="mt-1 block h-10 w-full rounded-xl border border-gray-200 px-2 text-sm" dir="auto" />
        </label>
        <button type="submit" className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">{t("Filter")}</button>
      </form>

      <div className="rounded-3xl border border-gray-200 bg-white p-4 text-gray-900 shadow-sm sm:p-6">
        {!rows ? (
          <div className="h-24 animate-pulse rounded-2xl bg-gray-50" />
        ) : rows.length ? (
          <ul className="divide-y divide-gray-100">
            {rows.map((r) => (
              <li key={r.id} className="py-3 text-sm">
                <button type="button" onClick={() => setOpen(open === r.id ? 0 : r.id)} className="flex w-full flex-wrap items-center justify-between gap-2 text-start">
                  <span className="min-w-0">
                    <span className="font-semibold">{r.admin_name || `#${r.admin_id}`}</span>
                    <span className="ms-2 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-700" dir="ltr">{r.method}</span>
                    <span className="ms-2 break-all font-mono text-xs text-gray-600" dir="ltr">{r.path.replace("/api/v1/admin", "")}</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs">
                    <span className={["rounded-full px-2 py-0.5 font-semibold", r.status < 400 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"].join(" ")}>
                      {r.status < 400 ? t("Done") : t("Refused ({status})", { status: r.status })}
                    </span>
                    <span className="text-gray-500" dir="ltr">{time(r.created_at)}</span>
                  </span>
                </button>
                {open === r.id ? (
                  <div className="mt-1 text-xs text-gray-600">
                    <p>{r.admin_email} · {r.ip}{r.target_type ? ` · ${r.target_type}${r.target_id ? ` #${r.target_id}` : ""}` : ""}</p>
                    <Body text={r.body} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">{t("Nothing recorded yet.")}</p>
        )}
        {paging && paging.total_pages > 1 ? (
          <div className="mt-4 flex items-center justify-between text-sm">
            <button type="button" disabled={!paging.has_prev} onClick={() => setPage(page - 1)} className="rounded-xl border border-gray-200 px-3 py-1.5 disabled:opacity-40">{t("Previous")}</button>
            <span className="text-gray-500">{page} / {paging.total_pages}</span>
            <button type="button" disabled={!paging.has_next} onClick={() => setPage(page + 1)} className="rounded-xl border border-gray-200 px-3 py-1.5 disabled:opacity-40">{t("Next")}</button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
