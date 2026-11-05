// Stub – replace with full implementation
import { Link } from "react-router-dom";
import { useT } from "../i18n";
import { Icon } from "@parthub/shared/icons";
export default function NotFoundPage() {
  const t = useT();
  return (
    <div className="container-app py-24 text-center">
      <Icon name="compass" className="mx-auto mb-4 h-16 w-16 text-faint" />
      <h1 className="text-3xl font-bold text-ink mb-3">{t("Page Not Found")}</h1>
      <p className="text-muted mb-6">{t("The page you're looking for doesn't exist.")}</p>
      <Link to="/" className="bg-navy text-white px-6 py-3 rounded-lg font-semibold hover:bg-navy-deep transition">
        {t("Back to Home")}
      </Link>
    </div>
  );
}
