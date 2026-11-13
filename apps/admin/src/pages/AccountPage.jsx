import ChangePasswordForm, { DevicesList } from "@parthub/shared/account";
import { ADMIN_TOKEN_KEY } from "@parthub/shared";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n";

// The signed-in admin's account: e-mail and password change (API: POST
// /api/v1/auth/password; other devices are signed out).
export default function AccountPage() {
  const t = useT();
  const { user, logout } = useAuth();
  return (
    <section className="space-y-6 pb-16">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 p-6 text-white shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold sm:text-5xl">{t("My account")}</h1>
        <p className="mt-3 text-sm text-slate-200">{user?.email || ""}</p>
      </div>
      <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-lg font-bold text-white">{t("Password")}</h2>
        <p className="mt-1 text-sm text-gray-400">{t("Admin accounts control the whole platform: use a long password used nowhere else.")}</p>
        <div className="mt-4">
          <ChangePasswordForm
            t={t}
            tone="dark"
            submit={(current, next) => api.post("/api/v1/auth/password", { current_password: current, new_password: next }).then((r) => r?.data)}
            onToken={(token) => {
              try {
                localStorage.setItem(ADMIN_TOKEN_KEY, token);
                localStorage.removeItem("ph_admin_password_weak");
              } catch {
                // ignore
              }
            }}
          />
        </div>
      </div>
      <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-lg font-bold text-white">{t("My devices")}</h2>
        <p className="mt-1 text-sm text-gray-400">{t("Where your account is signed in. Sign out a device you do not recognise.")}</p>
        <div className="mt-4">
          <DevicesList t={t} tone="dark" get={(p) => api.get(p).then((r) => r?.data)} del={(p) => api.delete(p)} post={(p, b) => api.post(p, b)} onEverywhere={logout} />
        </div>
      </div>
    </section>
  );
}
