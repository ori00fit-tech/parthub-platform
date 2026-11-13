import { Link, useLocation, useNavigate } from "react-router-dom";
import { ForgotPasswordFlow, ResetLinkForm } from "@parthub/shared/account";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n";

// /forgot-password: a code on WhatsApp (to the store's number). /reset-password?token=…:
// the one-time link PartHub sent. Both sign the seller in at the end.
export default function ForgotPasswordPage({ withLink = false }) {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const params = new URLSearchParams(location.search);
  const post = (path, body) => api.post(path, body).then((r) => r?.data);
  const done = async (email, password) => {
    if (email) await login(email, password).catch(() => navigate("/auth"));
    navigate("/");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-blue-700">PartHub Seller</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{withLink ? t("Choose a new password") : t("Forgot your password?")}</h1>
        <div className="mt-5">
          {withLink ? (
            <ResetLinkForm token={params.get("token") || ""} post={post} onDone={done} t={t} />
          ) : (
            <ForgotPasswordFlow post={post} onDone={done} t={t} initialIdentifier={params.get("email") || ""} />
          )}
        </div>
        <p className="mt-6 text-center text-sm">
          <Link to="/auth" className="font-semibold text-blue-700 hover:underline">{t("Back to sign in")}</Link>
        </p>
      </section>
    </main>
  );
}
