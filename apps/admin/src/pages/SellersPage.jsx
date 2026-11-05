import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { reasonPromptFor, useReasonDialog } from "../components/ReasonDialog";
import { notifyPendingChanged } from "../lib/pending";
import { statusLabel, useT } from "../i18n";

const STATUSES = ["", "pending", "active", "rejected", "suspended"];
const PAGE_SIZE = 20;

function normalizePagination(payload) {
  const meta = payload?.pagination || payload?.meta || {};
  return {
    page: Number(meta.page || 1),
    total: Number(meta.total || 0),
    totalPages: Math.max(1, Number(meta.total_pages || 1)),
  };
}

function statusClasses(status) {
  switch (status) {
    case "active":
      return "bg-green-50 text-green-700 border-green-200";
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "rejected":
    case "suspended":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export default function SellersPage() {
  const t = useT();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  const status = searchParams.get("status") || "";
  const q = searchParams.get("q") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const [search, setSearch] = useState(q);

  const { ask: askReason, dialog: reasonDialog } = useReasonDialog();

  function setParam(updates) {
    const qs = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(updates)) {
      if (v === "" || v === null || v === undefined) qs.delete(k);
      else qs.set(k, String(v));
    }
    if (!("page" in updates)) qs.delete("page");
    setSearchParams(qs, { replace: true });
  }

  async function loadRows() {
    try {
      setLoading(true);
      setError("");
      const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (status) qs.set("status", status);
      if (q) qs.set("q", q);
      const res = await api.get(`/api/v1/admin/sellers?${qs}`);
      setRows(Array.isArray(res?.data) ? res.data : []);
      setMeta(normalizePagination(res));
      setSelected(new Set());
    } catch (err) {
      setError(err?.message || t("Failed to load sellers"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, [status, q, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (search === q) return undefined;
    const timer = setTimeout(() => setParam({ q: search.trim() }), 350);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function updateStatus(id, nextStatus, label) {
    const prompt = reasonPromptFor("seller", nextStatus, label);
    let reason;
    if (prompt) {
      reason = await askReason(prompt);
      if (reason === null) return;
    }
    try {
      await api.patch(`/api/v1/admin/sellers/${id}/status`, { status: nextStatus, reason });
      notifyPendingChanged();
      await loadRows();
    } catch (err) {
      setError(err?.message || t("Failed to update seller status"));
    }
  }

  async function bulk(nextStatus) {
    const ids = [...selected];
    if (!ids.length) return;
    const label = ids.length === 1 ? rows.find((r) => r.id === ids[0])?.name : t("{n} selected stores", { n: ids.length });
    const prompt = reasonPromptFor("seller", nextStatus, label);
    let reason;
    if (prompt) {
      reason = await askReason(prompt);
      if (reason === null) return;
    }
    try {
      setBusy(true);
      setError("");
      const res = await api.post("/api/v1/admin/sellers/bulk-status", { ids, status: nextStatus, reason });
      const n = res?.data?.updated?.length ?? 0;
      setNotice(t("{n} stores updated: {status}", { n, status: statusLabel(nextStatus) }));
      notifyPendingChanged();
      await loadRows();
    } catch (err) {
      setError(err?.message || t("Failed to update seller status"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6 pb-24">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-700 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">{t("Seller moderation")}</h1>
        <p className="mt-3 text-sm text-blue-100 sm:text-base">
          {t("Review seller onboarding status, approve trusted suppliers, and suspend problematic accounts.")}
        </p>
      </div>

      <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("Status")}>
          {STATUSES.map((item) => (
            <button
              key={item || "all"}
              type="button"
              role="tab"
              aria-selected={status === item}
              onClick={() => setParam({ status: item })}
              className={[
                "inline-flex h-10 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition",
                status === item ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
              ].join(" ")}
            >
              {item ? statusLabel(item) : t("All sellers")}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("Search store, city or email…")}
          aria-label={t("Search")}
          className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500 md:max-w-md"
        />
        <div className="text-sm text-gray-500">
          {loading ? t("Loading sellers...") : meta.total === 1 ? t("1 seller") : t("{n} sellers", { n: meta.total })}
        </div>
      </div>

      {error ? <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm" role="alert">{error}</div> : null}
      {notice && !error ? (
        <div className="flex items-center justify-between gap-3 rounded-3xl border border-green-200 bg-green-50 px-5 py-3 text-sm text-green-800" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} className="font-semibold underline">
            {t("Close")}
          </button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">{t("Loading seller moderation queue...")}</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">{t("No sellers found for this filter.")}</div>
        ) : (
          <>
            <label className="flex cursor-pointer items-center gap-3 border-b border-gray-100 bg-gray-50 px-5 py-3 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                className="h-5 w-5 accent-blue-600"
              />
              {t("Select all on this page")}
            </label>
            <div className="divide-y divide-gray-100">
              {rows.map((seller) => (
                <div key={seller.id} className={["flex gap-4 p-5", selected.has(seller.id) ? "bg-blue-50/60" : ""].join(" ")}>
                  <input
                    type="checkbox"
                    checked={selected.has(seller.id)}
                    onChange={() => toggle(seller.id)}
                    aria-label={t("Select {name}", { name: seller.name })}
                    className="mt-1 h-5 w-5 flex-none accent-blue-600"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900">{seller.name}</h2>
                        <span className={["rounded-full border px-3 py-1 text-xs font-semibold", statusClasses(seller.status)].join(" ")}>
                          {statusLabel(seller.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {[seller.location, seller.email, seller.user_phone].filter(Boolean).join(" • ") || t("n/a")}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-gray-600">{seller.description || t("No seller description provided yet.")}</p>
                      {seller.moderation_note ? (
                        <p className="mt-2 text-xs text-red-700">
                          {t("Message to seller:")} {seller.moderation_note}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/sellers/${seller.id}`} className="inline-flex h-10 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50">
                        {t("View details")}
                      </Link>
                      {seller.status !== "active" ? (
                        <button type="button" onClick={() => updateStatus(seller.id, "active", seller.name)} className="inline-flex h-10 items-center justify-center rounded-2xl bg-green-600 px-4 text-sm font-semibold text-white transition hover:bg-green-700">
                          {t("Approve")}
                        </button>
                      ) : null}
                      {seller.status === "active" ? (
                        <button type="button" onClick={() => updateStatus(seller.id, "suspended", seller.name)} className="inline-flex h-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-700 transition hover:bg-amber-100">
                          {t("Suspend")}
                        </button>
                      ) : null}
                      {seller.status === "pending" ? (
                        <button type="button" onClick={() => updateStatus(seller.id, "rejected", seller.name)} className="inline-flex h-10 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                          {t("Reject")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {meta.totalPages > 1 ? (
        <nav className="flex items-center justify-center gap-3" aria-label={t("Pages")}>
          <button type="button" disabled={page <= 1} onClick={() => setParam({ page: page - 1 })} className="h-10 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 disabled:opacity-40">
            {t("Previous")}
          </button>
          <span className="text-sm text-gray-600">{t("Page {n} of {total}", { n: page, total: meta.totalPages })}</span>
          <button type="button" disabled={page >= meta.totalPages} onClick={() => setParam({ page: page + 1 })} className="h-10 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 disabled:opacity-40">
            {t("Next")}
          </button>
        </nav>
      ) : null}

      {selected.size ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,.25)] backdrop-blur lg:ps-72">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
            <span className="me-auto text-sm font-semibold text-gray-900">
              {selected.size === 1 ? t("1 selected") : t("{n} selected", { n: selected.size })}
            </span>
            <button type="button" disabled={busy} onClick={() => bulk("active")} className="h-10 rounded-2xl bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
              {t("Approve")}
            </button>
            <button type="button" disabled={busy} onClick={() => bulk("suspended")} className="h-10 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60">
              {t("Suspend")}
            </button>
            <button type="button" disabled={busy} onClick={() => bulk("rejected")} className="h-10 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60">
              {t("Reject")}
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className="h-10 rounded-2xl px-3 text-sm font-semibold text-gray-500 hover:bg-gray-100">
              {t("Clear")}
            </button>
          </div>
        </div>
      ) : null}
      {reasonDialog}
    </section>
  );
}
