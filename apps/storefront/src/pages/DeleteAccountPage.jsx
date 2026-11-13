import { Link } from "react-router-dom";
import { DeleteAccountPanel } from "@parthub/shared/account";
import { apiGet, apiPost } from "../lib/api";
import { useAuth } from "../features/auth/AuthContext";
import { useT } from "../i18n";

// /delete-account — public: what deletion does, and the form when signed in.
// This address is given to the app stores (Google Play's deletion link).
export default function DeleteAccountPage() {
  const t = useT();
  const { isAuthenticated, logout } = useAuth();
  return (
    <section className="mx-auto max-w-xl py-8">
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-ink">{t("Delete my PartHub account")}</h1>
        <div className="mt-5">
          <DeleteAccountPanel
            t={t}
            signedIn={isAuthenticated}
            signInHref="/auth?redirect=/delete-account"
            get={(path) => apiGet(path, undefined, { auth: true }).then((r) => r?.data)}
            post={(path, body) => apiPost(path, body, { auth: true }).then((r) => r?.data)}
            onDeleted={() => logout()}
          />
        </div>
        <p className="mt-6 text-center text-sm">
          <Link to="/legal/privacy" className="font-semibold text-link hover:underline">{t("Privacy policy")}</Link>
        </p>
      </div>
    </section>
  );
}
