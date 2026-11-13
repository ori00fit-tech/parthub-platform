import { Link, useLocation, useNavigate } from "react-router-dom";
import { ForgotPasswordFlow, ResetLinkForm } from "@parthub/shared/account";
import { apiPost } from "../lib/api";
import { useAuth } from "../features/auth/AuthContext";
import { useT } from "../i18n";

// /forgot-password: a code on WhatsApp. /reset-password?token=…: the
// one-time link PartHub sent. Both sign the buyer in at the end.
export default function ForgotPasswordPage({ withLink = false }) {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const params = new URLSearchParams(location.search);
  const post = (path, body) => apiPost(path, body).then((r) => r?.data);
  const done = async (email, password) => {
    if (email) await login(email, password).catch(() => navigate("/auth"));
    navigate("/account");
  };

  return (
    <section className="mx-auto max-w-md py-8">
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-ink">{withLink ? t("Choose a new password") : t("Forgot your password?")}</h1>
        <div className="mt-5">
          {withLink ? (
            <ResetLinkForm token={params.get("token") || ""} post={post} onDone={done} t={t} />
          ) : (
            <ForgotPasswordFlow post={post} onDone={done} t={t} initialIdentifier={params.get("email") || ""} />
          )}
        </div>
        <p className="mt-6 text-center text-sm">
          <Link to="/auth" className="font-semibold text-link hover:underline">{t("Back to sign in")}</Link>
        </p>
      </div>
    </section>
  );
}
