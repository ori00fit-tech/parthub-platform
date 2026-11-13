import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useT } from "../i18n";

// Template Center (API: /api/v1/admin/whatsapp/templates, catalog in
// workers/api/src/utils/wa-templates.ts, guide in
// infra/docs/whatsapp-templates.md): every template PartHub sends, the
// event that sends it, its text in Arabic, French and English, Meta's
// review status per language, and what was sent over 30 days.

const LANG_LABEL = { ar: "العربية", fr: "Français", en: "English" };
const STATUS_TONE = {
  approved: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  in_appeal: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-700",
  error: "bg-red-100 text-red-700",
  paused: "bg-orange-100 text-orange-800",
  disabled: "bg-gray-200 text-gray-700",
  draft: "bg-gray-100 text-gray-600",
};
const STATUS_LABEL = {
  approved: "Approved",
  pending: "Pending review",
  in_appeal: "In appeal",
  rejected: "Rejected",
  error: "Submit failed",
  paused: "Paused",
  disabled: "Disabled",
  draft: "Draft",
};
const AUDIENCE = { buyer: "Buyer", seller: "Seller", account: "Account" };
const MANUAL = ["", "draft", "pending", "approved", "rejected", "paused", "disabled"];

function Chip({ status, lang }) {
  const t = useT();
  const s = status || "none";
  return (
    <span className={["inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_TONE[s] || "bg-gray-100 text-gray-500"].join(" ")}>
      <span className="uppercase">{lang}</span>
      <span>· {status ? t(STATUS_LABEL[s] || s) : t("Not submitted")}</span>
    </span>
  );
}

function Template({ tpl, canManage, busy, onSubmit, onManual }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const s = tpl.stats;
  return (
    <li className="rounded-3xl border border-gray-200 bg-white p-5 text-gray-900 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-bold" dir="ltr">{tpl.name}</p>
          <p className="mt-1 text-sm text-gray-600">{tpl.trigger}</p>
          <p className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-gray-900 px-2.5 py-0.5 text-xs font-semibold text-white">{t(AUDIENCE[tpl.audience] || tpl.audience)}</span>
            {tpl.legacy ? <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">{t("Link in the text (first version)")}</span> : null}
            {tpl.button ? <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">{t("Button")}: {tpl.button.text.fr}</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["ar", "fr", "en"].map((l) => <Chip key={l} lang={l} status={tpl.versions[l]?.status} />)}
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-600">
        {t("30 days")}: {t("{n} sent", { n: s.sent })} · {t("{n} delivered", { n: s.delivered })} · {t("{n} read", { n: s.read })}
        {s.failed ? <span className="text-red-700"> · {t("{n} failed", { n: s.failed })}</span> : null}
        {s.skipped ? <span className="text-amber-700"> · {t("{n} not sent", { n: s.skipped })}</span> : null}
      </p>
      {s.last_error ? <p className="mt-1 text-xs text-red-700" dir="auto">{t("Last problem")}: {s.last_error}</p> : null}
      {canManage && ["ar", "fr", "en"].some((l) => ["rejected", "paused", "error"].includes(tpl.versions[l]?.status)) ? (
        <button type="button" disabled={busy} onClick={() => onSubmit(tpl.name)} className="mt-3 me-3 h-9 rounded-xl bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 disabled:bg-red-300">
          {t("Send the corrected text to Meta")}
        </button>
      ) : null}

      <button type="button" onClick={() => setOpen(!open)} className="mt-3 text-sm font-semibold text-blue-700 hover:underline">
        {open ? t("Hide the texts") : t("Show the texts")}
      </button>
      {open ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 lg:grid-cols-3">
            {["ar", "fr", "en"].map((l) => {
              const v = tpl.versions[l];
              return (
                <div key={l} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-gray-700">{LANG_LABEL[l]}</p>
                    <Chip lang={l} status={v?.status} />
                  </div>
                  <p dir={l === "ar" ? "rtl" : "ltr"} className="mt-2 whitespace-pre-line text-sm text-gray-900">{tpl.body[l]}</p>
                  {tpl.button ? <p className="mt-2 rounded-lg border border-gray-300 bg-white px-2 py-1 text-center text-xs font-semibold text-blue-700" dir={l === "ar" ? "rtl" : "ltr"}>{tpl.button.text[l]}</p> : null}
                  {v?.reason ? <p className="mt-2 text-xs text-red-700" dir="auto">{v.reason}</p> : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => navigator.clipboard?.writeText(tpl.body[l])} className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100">
                      {t("Copy text")}
                    </button>
                    {canManage && (v?.source !== "meta" || v?.status === "rejected" || v?.status === "paused") ? (
                      <button type="button" disabled={busy} onClick={() => onSubmit(tpl.name, l)} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300">
                        {t("Submit to Meta")}
                      </button>
                    ) : null}
                    {!canManage || v?.source === "manual" ? (
                      <label className="flex items-center gap-1 text-xs text-gray-600">
                        {t("Status")}
                        <select value={v?.status || ""} disabled={busy} onChange={(e) => onManual(tpl.name, l, e.target.value)} className="rounded-lg border border-gray-300 bg-white px-1 py-0.5 text-xs text-gray-900">
                          {MANUAL.map((m) => <option key={m} value={m}>{m ? t(STATUS_LABEL[m]) : t("Not submitted")}</option>)}
                        </select>
                      </label>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rounded-2xl bg-gray-50 p-3 text-xs text-gray-700">
            <p className="font-semibold">{t("Variables (same order in every language)")}</p>
            <ol className="mt-1 space-y-0.5">
              {tpl.params.map((p, i) => (
                <li key={p.name}><span className="font-mono" dir="ltr">{`{{${i + 1}}}`}</span> {p.name} — <span className="text-gray-500" dir="auto">{p.example}</span></li>
              ))}
            </ol>
            {tpl.button ? <p className="mt-2 font-mono" dir="ltr">{tpl.button.url} → {tpl.button.example}</p> : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

export default function WhatsAppTemplatesPage() {
  const t = useT();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [audience, setAudience] = useState("all");

  const load = () =>
    api
      .get("/api/v1/admin/whatsapp/templates")
      .then((r) => setData(r?.data || null))
      .catch((err) => setError(err?.message || t("Something went wrong. Please try again.")));
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(fn) {
    setBusy(true);
    setError("");
    setNote("");
    try {
      await fn();
    } catch (err) {
      setError(err?.message || t("Something went wrong. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  const sync = () =>
    run(async () => {
      const r = await api.post("/api/v1/admin/whatsapp/templates/sync", {});
      setData(r?.data || null);
      setNote(t("{n} PartHub templates found in Meta.", { n: r?.data?.found ?? 0 }));
    });

  // Meta takes them in batches: repeat until nothing is left.
  const submitAll = () =>
    run(async () => {
      let sent = 0;
      let failed = 0;
      for (let round = 0; round < 10; round++) {
        const r = await api.post("/api/v1/admin/whatsapp/templates/submit", {});
        const list = r?.data?.submitted || [];
        sent += list.filter((x) => x.status !== "error").length;
        failed += list.filter((x) => x.status === "error").length;
        setData(r?.data || null);
        setNote(t("{sent} submitted, {failed} refused so far…", { sent, failed }));
        if (!r?.data?.remaining) break;
      }
      setNote(t("{sent} submitted to Meta, {failed} refused. Meta reviews them, usually within minutes to 24 hours.", { sent, failed }));
    });

  const submitOne = (name, language) =>
    run(async () => {
      const r = await api.post("/api/v1/admin/whatsapp/templates/submit", language ? { name, language } : { name });
      setData(r?.data || null);
      const list = r?.data?.submitted || [];
      setNote(list.length ? list.map((x) => `${name} / ${x.language}: ${x.error || t(STATUS_LABEL[x.status] || x.status)}`).join(" · ") : t("Already in Meta."));
    });

  const manual = (name, lang, status) =>
    run(async () => {
      const r = await api.patch(`/api/v1/admin/whatsapp/templates/${name}/${lang}`, { status });
      setData(r?.data || null);
    });

  const counts = useMemo(() => {
    const out = { ar: {}, fr: {}, en: {} };
    for (const tpl of data?.templates || []) {
      for (const l of ["ar", "fr", "en"]) {
        const s = tpl.versions[l]?.status || "none";
        out[l][s] = (out[l][s] || 0) + 1;
      }
    }
    return out;
  }, [data]);

  const list = (data?.templates || []).filter((x) => audience === "all" || x.audience === audience);

  return (
    <section className="space-y-6 pb-16">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-700 p-6 text-white shadow-lg sm:p-8">
        <Link to="/whatsapp" className="text-sm font-semibold text-emerald-200 hover:underline">← WhatsApp</Link>
        <h1 className="mt-2 text-3xl font-bold sm:text-5xl">{t("WhatsApp templates")}</h1>
        <p className="mt-3 max-w-3xl text-sm text-emerald-100 sm:text-base">
          {t("Every message PartHub sends, the event that sends it, and its text in Arabic, French and English. Each person gets it in the language they use PartHub in; if Meta has not approved that language yet, in French, then Arabic, then English; if none is approved, nothing is sent and the reason is logged.")}
        </p>
      </div>

      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p> : null}
      {note ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">{note}</p> : null}

      {data ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
            <h2 className="text-xl font-bold">{t("Meta")}</h2>
            {data.can_manage ? (
              <>
                <p className="mt-2 text-sm text-gray-600">{t("PartHub reads the review status from Meta and can create the missing templates for you (category Utility).")}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={submitAll} className="h-10 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300">
                    {busy ? t("Working…") : t("Submit the missing ones to Meta")}
                  </button>
                  <button type="button" disabled={busy} onClick={sync} className="h-10 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50">
                    {t("Read statuses from Meta")}
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-2 space-y-2 text-sm text-gray-700">
                <p className="font-semibold text-amber-800">{t("To submit and follow the templates from here, add the Worker secret WHATSAPP_BUSINESS_ACCOUNT_ID.")}</p>
                <p>{t("Find it in Meta: WhatsApp Manager › Account tools, or API Setup (WhatsApp Business Account ID). The access token must also be allowed to manage templates (whatsapp_business_management).")}</p>
                <p>{t("Until then: create each template in WhatsApp Manager with the texts below (copy them), then set its status here by hand when Meta approves it.")}</p>
              </div>
            )}
            {!data.sending ? <p className="mt-3 text-sm font-semibold text-red-700">{t("Sending is off: the access token or the phone number id is missing.")}</p> : null}
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
            <h2 className="text-xl font-bold">{t("Languages")}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {["ar", "fr", "en"].map((l) => (
                <li key={l} className="flex flex-wrap items-center gap-2">
                  <span className="w-20 font-semibold">{LANG_LABEL[l]}</span>
                  {Object.entries(counts[l]).map(([s, n]) => (
                    <span key={s} className={["rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_TONE[s] || "bg-gray-100 text-gray-500"].join(" ")}>
                      {s === "none" ? t("Not submitted") : t(STATUS_LABEL[s] || s)}: {n}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-gray-500">{t("{n} templates, each tied to a real event. Darija can be added later as a fourth version.", { n: data.templates.length })}</p>
          </div>
        </div>
      ) : (
        <div className="h-32 animate-pulse rounded-3xl bg-white" />
      )}

      {data ? (
        <>
          <div className="flex flex-wrap gap-2">
            {["all", "buyer", "seller", "account"].map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAudience(a)}
                className={["h-9 rounded-full px-4 text-sm font-semibold", audience === a ? "bg-white text-gray-950" : "border border-gray-700 text-gray-200 hover:bg-gray-900"].join(" ")}
              >
                {a === "all" ? t("All") : t(AUDIENCE[a])} ({a === "all" ? data.templates.length : data.templates.filter((x) => x.audience === a).length})
              </button>
            ))}
          </div>
          <ul className="space-y-4">
            {list.map((tpl) => (
              <Template key={tpl.name} tpl={tpl} canManage={data.can_manage} busy={busy} onSubmit={submitOne} onManual={manual} />
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
