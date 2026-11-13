import { useEffect, useState } from "react";

// My devices (API: GET /api/v1/auth/sessions, DELETE /auth/sessions/:id,
// POST /auth/logout { everywhere }). get / del / post → Promise<data>.
// onEverywhere: called after "sign out everywhere" (the app signs out too).
export default function DevicesList({ get, del, post, t, tone = "light", onEverywhere }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const dark = tone === "dark";
  const load = () => get("/api/v1/auth/sessions").then((d) => setRows(Array.isArray(d) ? d : [])).catch((err) => setError(err?.message || ""));
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const when = (v) => {
    const d = new Date(`${String(v || "").replace(" ", "T")}Z`);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  async function signOut(id) {
    setError("");
    try {
      await del(`/api/v1/auth/sessions/${id}`);
      await load();
    } catch (err) {
      setError(err?.message || t("Something went wrong. Please try again."));
    }
  }

  async function everywhere() {
    setError("");
    try {
      await post("/api/v1/auth/logout", { everywhere: true });
      onEverywhere?.();
    } catch (err) {
      setError(err?.message || t("Something went wrong. Please try again."));
    }
  }

  const muted = dark ? "text-gray-400" : "text-gray-500";
  return (
    <div className="space-y-3">
      {!rows ? (
        <div className={["h-16 animate-pulse rounded-2xl", dark ? "bg-gray-800" : "bg-gray-100"].join(" ")} />
      ) : (
        <ul className={["divide-y rounded-2xl border", dark ? "divide-gray-800 border-gray-800" : "divide-gray-100 border-gray-200"].join(" ")}>
          {rows.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className={dark ? "font-semibold text-gray-100" : "font-semibold text-gray-900"}>
                  {d.device_name || t("Device")}
                  {d.current ? <span className="ms-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">{t("This device")}</span> : null}
                </p>
                <p className={`text-xs ${muted}`}>
                  {d.client === "app" ? t("App") : t("Website")} · {t("Last used {when}", { when: when(d.last_used_at) })}
                </p>
              </div>
              {!d.current ? (
                <button type="button" onClick={() => signOut(d.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">
                  {t("Sign out")}
                </button>
              ) : null}
            </li>
          ))}
          {!rows.length ? <li className={`px-4 py-3 text-sm ${muted}`}>{t("No other device.")}</li> : null}
        </ul>
      )}
      <button type="button" onClick={everywhere} className="text-sm font-semibold text-red-700 hover:underline">
        {t("Sign out everywhere (all devices, this one too)")}
      </button>
      {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
    </div>
  );
}
