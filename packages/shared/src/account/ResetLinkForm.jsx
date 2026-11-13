import { useState } from "react";

// A one-time reset link sent by PartHub (API: POST /api/v1/auth/reset-link).
// post(path, body) → Promise<data>; onDone(email, password) signs in.
const field = "mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500";
const label = "block text-sm font-semibold text-gray-800";

export default function ResetLinkForm({ token, post, onDone, t }) {
  const [form, setForm] = useState({ next: "", again: "" });
  const [show, setShow] = useState(false);
  const [state, setState] = useState({ busy: false, error: "", ok: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    if (form.next !== form.again) return setState({ busy: false, error: t("The two new passwords are not the same"), ok: "" });
    setState({ busy: true, error: "", ok: "" });
    try {
      const data = await post("/api/v1/auth/reset-link", { token, new_password: form.next });
      setState({ busy: false, error: "", ok: t("Password changed. Signing you in…") });
      await onDone(data?.email, form.next);
    } catch (err) {
      setState({ busy: false, error: err?.message || t("Something went wrong. Please try again."), ok: "" });
    }
  }

  if (!token) return <p className="text-sm text-red-700">{t("This link is not valid any more. Ask PartHub for a new one.")}</p>;
  return (
    <form onSubmit={save} className="space-y-4">
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
      <button type="submit" disabled={state.busy} className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300">
        {state.busy ? t("Please wait...") : t("Change my password")}
      </button>
      {state.ok ? <p className="text-sm text-emerald-700" role="status">{state.ok}</p> : null}
      {state.error ? <p className="text-sm text-red-700" role="alert">{state.error}</p> : null}
    </form>
  );
}
