import { Link } from "react-router-dom";
import { DeleteAccountPanel } from "@parthub/shared/account";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n";

// /delete-account — public: what deletion does, and the form when signed in.
export default function DeleteAccountPage() {
  const t = useT();
  const { isAuthenticated, logout } = useAuth();
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <section className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-blue-700">PartHub Seller</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{t("Delete my PartHub account")}</h1>
        <div className="mt-5">
          <DeleteAccountPanel
            t={t}
            signedIn={isAuthenticated}
            signInHref="/auth?redirect=/delete-account"
            get={(path) => api.get(path).then((r) => r?.data)}
            post={(path, body) => api.post(path, body).then((r) => r?.data)}
            onDeleted={() => logout()}
          />
        </div>
        <p className="mt-6 text-center text-sm">
          <Link to="/" className="font-semibold text-blue-700 hover:underline">{t("Back")}</Link>
        </p>
      </section>
    </main>
  );
}
