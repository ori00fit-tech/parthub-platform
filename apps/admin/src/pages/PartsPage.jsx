import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatMoney } from "@parthub/shared";
import { api } from "../lib/api";
import { reasonPromptFor, useReasonDialog } from "../components/ReasonDialog";
import { notifyPendingChanged } from "../lib/pending";
import { statusLabel, useT } from "../i18n";

const STATUSES = ["pending", "active", "rejected", "archived", "all"];
const PAGE_SIZE = 20;

function normalizePagination(payload) {
  // The API returns { pagination: { page, limit, total, total_pages } }.
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
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

const selectCls = "h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500";

export default function PartsPage() {
  const t = useT();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [sellers, setSellers] = useState([]);
  const [categories, setCategories] = useState([]);

  const status = searchParams.get("status") || "pending";
  const sellerId = searchParams.get("seller_id") || "";
  const categoryId = searchParams.get("category_id") || "";
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
      const qs = new URLSearchParams({ status, page: String(page), limit: String(PAGE_SIZE) });
      if (sellerId) qs.set("seller_id", sellerId);
      if (categoryId) qs.set("category_id", categoryId);
      if (q) qs.set("q", q);
      const res = await api.get(`/api/v1/admin/parts?${qs}`);
      setRows(Array.isArray(res?.data) ? res.data : []);
      setMeta(normalizePagination(res));
      setSelected(new Set());
    } catch (err) {
      setError(err?.message || t("Failed to load parts"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, [status, sellerId, categoryId, q, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter options.
  useEffect(() => {
    api.get("/api/v1/admin/sellers?limit=100").then((r) => setSellers(Array.isArray(r?.data) ? r.data : [])).catch(() => {});
    api.get("/api/v1/admin/categories").then((r) => setCategories(Array.isArray(r?.data) ? r.data : [])).catch(() => {});
  }, []);

  // Debounced search box → URL.
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
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  async function updateStatus(id, nextStatus, label) {
    const prompt = reasonPromptFor("part", nextStatus, label);
    let reason;
    if (prompt) {
      reason = await askReason(prompt);
      if (reason === null) return;
    }
    try {
      await api.patch(`/api/v1/admin/parts/${id}/status`, { status: nextStatus, reason });
      notifyPendingChanged();
      await loadRows();
    } catch (err) {
      setError(err?.message || t("Failed to update part status"));
    }
  }

  async function bulk(nextStatus) {
    const ids = [...selected];
    if (!ids.length) return;
    const label = ids.length === 1 ? rows.find((r) => r.id === ids[0])?.title : t("{n} selected parts", { n: ids.length });
    const prompt = reasonPromptFor("part", nextStatus, label);
    let reason;
    if (prompt) {
      reason = await askReason(prompt);
      if (reason === null) return;
    }
    try {
      setBusy(true);
      setError("");
      const res = await api.post("/api/v1/admin/parts/bulk-status", { ids, status: nextStatus, reason });
      const n = res?.data?.updated?.length ?? 0;
      setNotice(t("{n} parts updated: {status}", { n, status: statusLabel(nextStatus) }));
      notifyPendingChanged();
      await loadRows();
    } catch (err) {
      setError(err?.message || t("Failed to update part status"));
    } finally {
      setBusy(false);
    }
  }

  const filtersActive = sellerId || categoryId || q;
  const sellerOptions = useMemo(() => [...sellers].sort((a, b) => String(a.name).localeCompare(String(b.name))), [sellers]);

  return (
    <section className="space-y-6 pb-24">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-700 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">{t("Part moderation")}</h1>
        <p className="mt-3 text-sm text-indigo-100 sm:text-base">
          {t("Review marketplace listings, approve high-quality parts, and reject poor or invalid submissions.")}
        </p>
      </div>

      <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("Status")}>
          {STATUSES.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={status === item}
              onClick={() => setParam({ status: item })}
              className={[
                "inline-flex h-10 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition",
                status === item ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
              ].join(" ")}
            >
              {item === "all" ? t("All") : statusLabel(item)}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_220px_200px_auto]">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Search title, SKU or seller…")}
            aria-label={t("Search")}
            className={selectCls}
          />
          <select value={sellerId} onChange={(e) => setParam({ seller_id: e.target.value })} className={selectCls} aria-label={t("Seller")}>
            <option value="">{t("All sellers")}</option>
            {sellerOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select value={categoryId} onChange={(e) => setParam({ category_id: e.target.value })} className={selectCls} aria-label={t("Category")}>
            <option value="">{t("All categories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {t(c.name)}
              </option>
            ))}
          </select>
          {filtersActive ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setParam({ seller_id: "", category_id: "", q: "" });
              }}
              className="h-11 rounded-2xl px-4 text-sm font-semibold text-gray-600 hover:bg-gray-100"
            >
              {t("Clear filters")}
            </button>
          ) : null}
        </div>

        <div className="text-sm text-gray-500">
          {loading ? t("Loading parts...") : meta.total === 1 ? t("1 listing") : t("{n} listings", { n: meta.total })}
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
          <div className="p-6 text-sm text-gray-500">{t("Loading moderation queue...")}</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">{filtersActive ? t("No parts match these filters.") : t("No parts found for this status.")}</div>
        ) : (
          <>
            <label className="flex cursor-pointer items-center gap-3 border-b border-gray-100 bg-gray-50 px-5 py-3 text-sm font-semibold text-gray-700">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-5 w-5 accent-blue-600" />
              {t("Select all on this page")}
            </label>
            <div className="divide-y divide-gray-100">
              {rows.map((part) => (
                <div key={part.id} className={["flex gap-4 p-5", selected.has(part.id) ? "bg-blue-50/60" : ""].join(" ")}>
                  <input
                    type="checkbox"
                    checked={selected.has(part.id)}
                    onChange={() => toggle(part.id)}
                    aria-label={t("Select {name}", { name: part.title })}
                    className="mt-1 h-5 w-5 flex-none accent-blue-600"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900">{part.title}</h2>
                        <span className={["rounded-full border px-3 py-1 text-xs font-semibold", statusClasses(part.status)].join(" ")}>
                          {statusLabel(part.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {part.seller_name || t("unknown")} • {part.category_name ? t(part.category_name) : t("Uncategorized")} • {formatMoney(part.price)}
                        {part.sku ? <span dir="ltr"> • {part.sku}</span> : null}
                      </p>
                      {part.description ? <p className="mt-2 line-clamp-2 text-sm text-gray-600">{part.description}</p> : null}
                      {part.moderation_note ? (
                        <p className="mt-2 text-xs text-red-700">
                          {t("Message to seller:")} {part.moderation_note}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/parts/${part.id}`} className="inline-flex h-10 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-50">
                        {t("View details")}
                      </Link>
                      {part.status !== "active" ? (
                        <button type="button" onClick={() => updateStatus(part.id, "active", part.title)} className="inline-flex h-10 items-center justify-center rounded-2xl bg-green-600 px-4 text-sm font-semibold text-white transition hover:bg-green-700">
                          {t("Approve")}
                        </button>
                      ) : null}
                      {part.status !== "rejected" ? (
                        <button type="button" onClick={() => updateStatus(part.id, "rejected", part.title)} className="inline-flex h-10 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                          {t("Reject")}
                        </button>
                      ) : null}
                      {part.status !== "archived" ? (
                        <button type="button" onClick={() => updateStatus(part.id, "archived", part.title)} className="inline-flex h-10 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-100">
                          {t("Archive")}
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
            <button type="button" disabled={busy} onClick={() => bulk("rejected")} className="h-10 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60">
              {t("Reject")}
            </button>
            <button type="button" disabled={busy} onClick={() => bulk("archived")} className="h-10 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60">
              {t("Archive")}
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
