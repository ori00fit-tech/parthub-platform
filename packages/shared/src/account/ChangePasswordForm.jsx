import { useState } from "react";

// Change the password of the signed-in account (API: POST
// /api/v1/auth/password). Same form in the three apps; each passes its own
// request function and translator. On success the API signs out every
// other device and returns a new token for this one (onToken).
export default function ChangePasswordForm({ submit, onToken, t, tone = "light" }) {
  const [form, setForm] = useState({ current: "", next: "", again: "" });
  const [show, setShow] = useState(false);
  const [state, setState] = useState({ saving: false, error: "", ok: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const dark = tone === "dark";
  const field = [
    "mt-1 h-11 w-full rounded-xl border px-3 text-sm outline-none focus:border-blue-500",
    dark ? "border-gray-700 bg-gray-800 text-gray-100" : "border-gray-200 bg-white text-gray-900",
  ].join(" ");
  const label = dark ? "block text-sm font-semibold text-gray-200" : "block text-sm font-semibold text-gray-800";

  async function save(e) {
    e.preventDefault();
    if (form.next !== form.again) return setState({ saving: false, error: t("The two new passwords are not the same"), ok: "" });
    setState({ saving: true, error: "", ok: "" });
    try {
      const res = await submit(form.current, form.next);
      if (res?.access_token) onToken(res.access_token);
      setForm({ current: "", next: "", again: "" });
      setState({ saving: false, error: "", ok: t("Password changed. Other devices are signed out.") });
    } catch (err) {
      setState({ saving: false, error: err?.message || t("Something went wrong. Please try again."), ok: "" });
    }
  }

  return (
    <form onSubmit={save} className="max-w-md space-y-3">
      <label className={label}>
        {t("Current password")}
        <input type={show ? "text" : "password"} autoComplete="current-password" required value={form.current} onChange={set("current")} className={field} />
      </label>
      <label className={label}>
        {t("New password")}
        <input type={show ? "text" : "password"} autoComplete="new-password" required minLength={8} value={form.next} onChange={set("next")} className={field} />
      </label>
      <label className={label}>
        {t("New password again")}
        <input type={show ? "text" : "password"} autoComplete="new-password" required value={form.again} onChange={set("again")} className={field} />
      </label>
      <p className={dark ? "text-xs text-gray-400" : "text-xs text-gray-500"}>{t("At least 8 characters (10 for admins). Not a common password, not your e-mail name.")}</p>
      <label className={dark ? "flex items-center gap-2 text-sm text-gray-300" : "flex items-center gap-2 text-sm text-gray-700"}>
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> {t("Show passwords")}
      </label>
      <button type="submit" disabled={state.saving} className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300">
        {state.saving ? t("Saving…") : t("Change password")}
      </button>
      {state.error ? <p className="text-sm text-red-600" role="alert">{state.error}</p> : null}
      {state.ok ? <p className={dark ? "text-sm text-emerald-400" : "text-sm text-emerald-700"} role="status">{state.ok}</p> : null}
    </form>
  );
}
