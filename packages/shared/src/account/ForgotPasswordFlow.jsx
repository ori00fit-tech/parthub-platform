import { useState } from "react";
import { SUPPORT_WHATSAPP } from "../legal/company.js";

// Forgot password (API: POST /api/v1/auth/forgot, then /auth/reset; rules in
// workers/api/src/utils/password-reset.ts). Step 1: e-mail or phone → a
// 6-digit code on WhatsApp. Step 2: the code and a new password. No code?
// A WhatsApp link to PartHub, who can send a one-time reset link.
// post(path, body) → Promise<data>; onDone(email, password) signs in.
const field = "mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500";
const label = "block text-sm font-semibold text-gray-800";
const button = "inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300";

export default function ForgotPasswordFlow({ post, onDone, t, initialIdentifier = "" }) {
  const [step, setStep] = useState("ask");
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [form, setForm] = useState({ code: "", next: "", again: "" });
  const [show, setShow] = useState(false);
  const [state, setState] = useState({ busy: false, error: "", info: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const help = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
    `${t("Hello PartHub, I forgot my password. My e-mail or phone:")} ${identifier.trim()}`
  )}`;

  async function ask(e) {
    e.preventDefault();
    if (!identifier.trim()) return setState({ busy: false, error: t("Enter your e-mail or phone number"), info: "" });
    setState({ busy: true, error: "", info: "" });
    try {
      const data = await post("/api/v1/auth/forgot", { identifier: identifier.trim() });
      setState({ busy: false, error: "", info: data?.message ? t(data.message) : "" });
      setStep("code");
    } catch (err) {
      setState({ busy: false, error: err?.message || t("Something went wrong. Please try again."), info: "" });
    }
  }

  async function reset(e) {
    e.preventDefault();
    if (form.next !== form.again) return setState((s) => ({ ...s, error: t("The two new passwords are not the same") }));
    setState((s) => ({ ...s, busy: true, error: "" }));
    try {
      const data = await post("/api/v1/auth/reset", { identifier: identifier.trim(), code: form.code.trim(), new_password: form.next });
      setState({ busy: false, error: "", info: t("Password changed. Signing you in…") });
      await onDone(data?.email, form.next);
    } catch (err) {
      setState((s) => ({ ...s, busy: false, error: err?.message || t("Something went wrong. Please try again.") }));
    }
  }

  return (
    <div className="space-y-4">
      {step === "ask" ? (
        <form onSubmit={ask} className="space-y-4">
          <p className="text-sm text-gray-600">{t("Enter the e-mail or phone number of your account. We send a 6-digit code on WhatsApp to the account's number.")}</p>
          <label className={label}>
            {t("E-mail or phone")}
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" dir="ltr" className={field} placeholder="you@example.com / 06…" />
          </label>
          <button type="submit" disabled={state.busy} className={button}>{state.busy ? t("Please wait...") : t("Send me a code")}</button>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-4">
          {state.info ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">{state.info}</p> : null}
          <label className={label}>
            {t("Code received on WhatsApp")}
            <input value={form.code} onChange={set("code")} inputMode="numeric" autoComplete="one-time-code" maxLength={6} dir="ltr" className={`${field} text-center font-mono text-lg tracking-[0.4em]`} />
          </label>
          <label className={label}>
            {t("New password")}
            <input type={show ? "text" : "password"} value={form.next} onChange={set("next")} autoComplete="new-password" className={field} />
          </label>
          <label className={label}>
            {t("New password again")}
            <input type={show ? "text" : "password"} value={form.again} onChange={set("again")} autoComplete="new-password" className={field} />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> {t("Show passwords")}
          </label>
          <p className="text-xs text-gray-500">{t("At least 8 characters. Not a common password, not your e-mail name.")}</p>
          <button type="submit" disabled={state.busy} className={button}>{state.busy ? t("Please wait...") : t("Change my password")}</button>
          <button type="button" onClick={() => { setStep("ask"); setForm({ code: "", next: "", again: "" }); setState({ busy: false, error: "", info: "" }); }} className="w-full text-sm font-semibold text-blue-700 hover:underline">
            {t("Send a new code")}
          </button>
        </form>
      )}
      {state.error ? <p className="text-sm text-red-700" role="alert">{state.error}</p> : null}
      <p className="text-center text-xs text-gray-500">
        {t("No WhatsApp on your account, or no code?")}{" "}
        <a href={help} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 hover:underline">{t("Write to PartHub on WhatsApp")}</a>
      </p>
    </div>
  );
}
