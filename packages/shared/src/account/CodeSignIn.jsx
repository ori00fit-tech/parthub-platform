import { useState } from "react";
import { SUPPORT_WHATSAPP } from "../legal/company.js";

// Sign in without a password (API: POST /api/v1/auth/login-code, then
// /auth/login-code/verify; rules in workers/api/src/utils/password-reset.ts).
// Step 1: the phone number → a 6-digit code on WhatsApp to the account's own
// number. Step 2: the code → signed in.
// post(path, body) → Promise<data>; onSession(data) stores the session
// (same data as /auth/login); onCancel() goes back to the password form.
const field = "mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500";
const label = "block text-sm font-semibold text-gray-800";
const button = "inline-flex h-11 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300";

export default function CodeSignIn({ post, onSession, onCancel, t, initialPhone = "" }) {
  const [step, setStep] = useState("ask");
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [state, setState] = useState({ busy: false, error: "", info: "" });

  const help = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
    `${t("Hello PartHub, I cannot sign in. My phone:")} ${phone.trim()}`
  )}`;

  async function ask(e) {
    e.preventDefault();
    if (!phone.trim()) return setState({ busy: false, error: t("Enter your phone number"), info: "" });
    setState({ busy: true, error: "", info: "" });
    try {
      const data = await post("/api/v1/auth/login-code", { identifier: phone.trim() });
      setState({ busy: false, error: "", info: data?.message ? t(data.message) : "" });
      setCode("");
      setStep("code");
    } catch (err) {
      setState({ busy: false, error: err?.message || t("Something went wrong. Please try again."), info: "" });
    }
  }

  async function verify(e) {
    e.preventDefault();
    if (code.replace(/\D/g, "").length !== 6) return setState((s) => ({ ...s, error: t("Enter the 6-digit code") }));
    setState((s) => ({ ...s, busy: true, error: "" }));
    try {
      const data = await post("/api/v1/auth/login-code/verify", { identifier: phone.trim(), code: code.trim() });
      await onSession(data);
    } catch (err) {
      setState((s) => ({ ...s, busy: false, error: err?.message || t("Something went wrong. Please try again.") }));
    }
  }

  return (
    <div className="space-y-4">
      {step === "ask" ? (
        <form onSubmit={ask} className="space-y-4">
          <p className="text-sm text-gray-600">{t("Enter the phone number of your account. We send you a 6-digit code on WhatsApp: no password needed.")}</p>
          <label className={label}>
            {t("Phone number")}
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" className={field} placeholder="06 12 34 56 78" />
          </label>
          <button type="submit" disabled={state.busy} className={button}>{state.busy ? t("Please wait...") : t("Send me a code on WhatsApp")}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          {state.info ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">{state.info}</p> : null}
          <label className={label}>
            {t("Code received on WhatsApp")}
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} dir="ltr" className={`${field} text-center font-mono text-lg tracking-[0.4em]`} />
          </label>
          <button type="submit" disabled={state.busy} className={button}>{state.busy ? t("Please wait...") : t("Sign in")}</button>
          <button type="button" onClick={() => { setStep("ask"); setState({ busy: false, error: "", info: "" }); }} className="w-full text-sm font-semibold text-blue-700 hover:underline">
            {t("Send a new code")}
          </button>
        </form>
      )}
      {state.error ? <p className="text-sm text-red-700" role="alert">{state.error}</p> : null}
      {onCancel ? (
        <button type="button" onClick={onCancel} className="w-full text-sm font-semibold text-gray-700 hover:underline">
          {t("Sign in with my e-mail and password")}
        </button>
      ) : null}
      <p className="text-center text-xs text-gray-500">
        {t("No phone on your account, or no code?")}{" "}
        <a href={help} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 hover:underline">{t("Write to PartHub on WhatsApp")}</a>
      </p>
    </div>
  );
}
