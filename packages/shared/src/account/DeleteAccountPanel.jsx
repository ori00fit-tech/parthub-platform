import { useEffect, useState } from "react";
import { SUPPORT_WHATSAPP } from "../legal/company.js";

// Account deletion (API: GET/POST /api/v1/auth/delete-account; rules in
// workers/api/src/utils/account-deletion.ts). Public page content (stores
// such as Google Play link to it) + the form for a signed-in person.
// get(path) / post(path, body) → Promise<data>.
const box = "rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700";

export function DeletionCancelledNotice({ t }) {
  const [show, setShow] = useState(() => {
    try {
      return sessionStorage.getItem("ph_deletion_cancelled") === "1";
    } catch {
      return false;
    }
  });
  if (!show) return null;
  const close = () => {
    try {
      sessionStorage.removeItem("ph_deletion_cancelled");
    } catch {
      // ignore
    }
    setShow(false);
  };
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
      <span>{t("Welcome back: your account will not be deleted.")}</span>
      <button type="button" onClick={close} className="text-xs font-semibold underline">{t("Close")}</button>
    </div>
  );
}

// Called by the apps' login: remembers the notice for the next page.
export function noteDeletionCancelled(loginData) {
  if (!loginData?.deletion_cancelled) return;
  try {
    sessionStorage.setItem("ph_deletion_cancelled", "1");
  } catch {
    // ignore
  }
}

export default function DeleteAccountPanel({ get, post, t, signedIn, signInHref, onDeleted }) {
  const [check, setCheck] = useState(null);
  const [form, setForm] = useState({ password: "", reason: "", sure: false });
  const [state, setState] = useState({ busy: false, error: "", done: "" });

  useEffect(() => {
    if (!signedIn) return;
    get("/api/v1/auth/delete-account").then(setCheck).catch((err) => setState((s) => ({ ...s, error: err?.message || "" })));
  }, [signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e) {
    e.preventDefault();
    if (!form.sure) return setState({ busy: false, error: t("Tick the box to confirm."), done: "" });
    setState({ busy: true, error: "", done: "" });
    try {
      const data = await post("/api/v1/auth/delete-account", { password: form.password, reason: form.reason.trim() || undefined });
      setState({ busy: false, error: "", done: t(data?.message || "Your account is closed.") });
      onDeleted?.();
    } catch (err) {
      setState({ busy: false, error: err?.message || t("Something went wrong. Please try again."), done: "" });
    }
  }

  const help = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(t("Hello PartHub, I want to delete my account. My e-mail or phone:"))}`;

  return (
    <div className="space-y-4 text-start">
      <div className={box}>
        <p className="font-semibold text-gray-900">{t("What happens")}</p>
        <ul className="mt-2 list-disc space-y-1 ps-5">
          <li>{t("Your account is closed at once and you are signed out everywhere. A seller's store is hidden.")}</li>
          <li>{t("You have 30 days to change your mind: just sign in again and everything comes back.")}</li>
          <li>{t("After 30 days your personal data is erased: name, e-mail, phone, password, addresses, WhatsApp messages, alerts.")}</li>
          <li>{t("Orders, invoices and reviews are kept without your name, as the law requires for accounting.")}</li>
        </ul>
      </div>

      {state.done ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">{state.done}</p>
      ) : !signedIn ? (
        <div className={box}>
          <p>{t("Sign in to delete your account, or ask PartHub on WhatsApp.")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={signInHref} className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">{t("Sign in")}</a>
            <a href={help} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-100">{t("Write to PartHub on WhatsApp")}</a>
          </div>
        </div>
      ) : !check ? (
        <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
      ) : !check.can_delete ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">{t("Your account cannot be deleted yet:")}</p>
          <ul className="mt-2 list-disc space-y-1 ps-5">
            {check.blockers.map((b) => <li key={b.code}>{t(b.message)}</li>)}
          </ul>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-semibold text-gray-800">
            {t("Why are you leaving? (optional)")}
            <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={2} maxLength={500} dir="auto" className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500" />
          </label>
          <label className="block text-sm font-semibold text-gray-800">
            {t("Your password")}
            <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} autoComplete="current-password" className="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500" />
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.sure} onChange={(e) => setForm((f) => ({ ...f, sure: e.target.checked }))} className="mt-1" />
            {t("I understand: my account closes now and my personal data is erased in 30 days.")}
          </label>
          <button type="submit" disabled={state.busy} className="inline-flex h-11 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-red-300">
            {state.busy ? t("Please wait...") : t("Delete my account")}
          </button>
        </form>
      )}
      {state.error ? <p className="text-sm text-red-700" role="alert">{state.error}</p> : null}
    </div>
  );
}
