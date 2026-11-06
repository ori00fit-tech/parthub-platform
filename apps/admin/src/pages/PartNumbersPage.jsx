import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useT } from "../i18n";
import { notifyPendingChanged } from "../lib/pending";

// Part numbers: sellers' claims that their part replaces an original number
// wait here. Once verified, the two numbers count as the same part for every
// listing (search by number, "other offers" on part pages).

const card = "rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm";
const input = "h-10 w-full rounded-xl border border-gray-700 bg-gray-950 px-3 font-mono text-sm text-gray-100 outline-none focus:border-blue-500";
const btn = "h-9 rounded-xl px-3 text-sm font-semibold transition disabled:opacity-50";

function Num({ number, kind, brand }) {
  const t = useT();
  return (
    <span className="inline-flex flex-wrap items-baseline gap-1">
      <span className="font-mono font-semibold text-gray-100" dir="ltr">{number}</span>
      <span className="text-xs text-gray-400">{kind === "oem" ? t("original (OEM)") : brand || t("parts maker")}</span>
    </span>
  );
}

function Claim({ item, onDone }) {
  const t = useT();
  const [relation, setRelation] = useState(item.relation || "equivalent");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function decide(decision) {
    setBusy(decision);
    setError("");
    try {
      await api.post(`/api/v1/admin/part-numbers/links/${item.id}/decide`, { decision, relation });
      notifyPendingChanged();
      onDone();
    } catch (err) {
      setError(err?.message || t("Something went wrong. Please try again."));
    } finally {
      setBusy("");
    }
  }
  const done = item.verification !== "unverified";
  return (
    <article className="rounded-2xl border border-gray-800 bg-gray-950 p-4">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <Num number={item.from_number} kind={item.from_kind} brand={item.from_brand} />
        <span className="text-gray-500">{item.relation === "supersedes" ? t("supersedes") : t("replaces / same part as")}</span>
        <Num number={item.to_number} kind={item.to_kind} brand={item.to_brand} />
      </p>
      <p className="mt-2 text-xs text-gray-400">
        {item.source === "admin" ? t("Added by admin") : t("Claimed by {name}", { name: item.claimed_by || "—" })}
        {item.claimed_on ? ` · ${item.claimed_on}` : ""}
        {" · "}
        {t("{a} and {b} listings carry these numbers", { a: item.from_listings, b: item.to_listings })}
      </p>
      {done ? (
        <p className={`mt-2 text-xs font-semibold ${item.verification === "rejected" ? "text-red-300" : "text-emerald-300"}`}>
          {item.verification === "rejected" ? t("Rejected") : t("Verified")}
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select value={relation} onChange={(e) => setRelation(e.target.value)} className="h-9 rounded-xl border border-gray-700 bg-gray-900 px-2 text-sm text-gray-100" aria-label={t("Relation")}>
            <option value="equivalent">{t("Same part (equivalent)")}</option>
            <option value="supersedes">{t("New number replacing an old one")}</option>
          </select>
          <button type="button" onClick={() => decide("verify")} disabled={Boolean(busy)} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-500`}>
            {busy === "verify" ? t("Saving…") : t("Verify")}
          </button>
          <button type="button" onClick={() => decide("reject")} disabled={Boolean(busy)} className={`${btn} border border-gray-700 text-gray-300 hover:bg-gray-800`}>
            {t("Reject")}
          </button>
        </div>
      )}
      {error ? <p className="mt-2 text-sm text-red-400" role="alert">{error}</p> : null}
    </article>
  );
}

export default function PartNumbersPage() {
  const t = useT();
  const [all, setAll] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ from: "", fromKind: "aftermarket", to: "", relation: "equivalent" });
  const [formState, setFormState] = useState({ busy: false, error: "", ok: "" });

  const load = useCallback(
    () =>
      api
        .get(`/api/v1/admin/part-numbers/links${all ? "?status=all" : ""}`)
        .then((r) => (setRows(Array.isArray(r?.data) ? r.data : []), setError("")))
        .catch((e) => setError(e?.message || "")),
    [all]
  );
  useEffect(() => {
    load();
  }, [load]);

  async function addLink(e) {
    e.preventDefault();
    setFormState({ busy: true, error: "", ok: "" });
    try {
      await api.post("/api/v1/admin/part-numbers/links", {
        from: { number: form.from, kind: form.fromKind },
        to: { number: form.to, kind: "oem" },
        relation: form.relation,
      });
      setFormState({ busy: false, error: "", ok: t("Link saved.") });
      setForm((f) => ({ ...f, from: "", to: "" }));
      load();
    } catch (err) {
      setFormState({ busy: false, error: err?.message || t("Something went wrong. Please try again."), ok: "" });
    }
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-800 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">{t("Part numbers")}</h1>
        <p className="mt-3 max-w-3xl text-sm text-cyan-100 sm:text-base">
          {t("Sellers say which original numbers their parts replace. Check each claim (catalogue, box, maker's site): once verified, buyers searching either number find all these listings.")}
        </p>
      </div>
      {error ? <p className="rounded-2xl bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-gray-100">{all ? t("All links") : t("Claims to check")} <span className="text-gray-500">({rows.length})</span></h2>
            <button type="button" onClick={() => setAll((v) => !v)} className={`${btn} border border-gray-700 text-gray-300 hover:bg-gray-800`}>
              {all ? t("Claims to check") : t("All links")}
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {rows.length ? rows.map((r) => <Claim key={r.id} item={r} onDone={load} />) : <p className="text-sm text-gray-500">{t("Nothing to check.")}</p>}
          </div>
        </div>

        <form onSubmit={addLink} className={`${card} space-y-3`}>
          <h2 className="text-xl font-bold text-gray-100">{t("Add a verified link")}</h2>
          <p className="text-sm text-gray-400">{t("For a cross-reference you checked yourself.")}</p>
          <select value={form.fromKind} onChange={(e) => setForm({ ...form, fromKind: e.target.value })} className={input} aria-label={t("Type of the first number")}>
            <option value="aftermarket">{t("Parts maker's number")}</option>
            <option value="oem">{t("Original (OEM) number")}</option>
          </select>
          <input value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} className={input} dir="ltr" placeholder="439745" aria-label={t("First number")} />
          <select value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} className={input} aria-label={t("Relation")}>
            <option value="equivalent">{t("Same part (equivalent)")}</option>
            <option value="supersedes">{t("New number replacing an old one")}</option>
          </select>
          <input value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} className={input} dir="ltr" placeholder="7701 208 174" aria-label={t("Original (OEM) number")} />
          {formState.error ? <p className="text-sm text-red-400" role="alert">{formState.error}</p> : null}
          {formState.ok ? <p className="text-sm text-emerald-400" role="status">{formState.ok}</p> : null}
          <button type="submit" disabled={formState.busy} className={`${btn} h-10 bg-blue-600 px-5 text-white hover:bg-blue-500`}>
            {formState.busy ? t("Saving…") : t("Save link")}
          </button>
        </form>
      </div>
    </section>
  );
}
