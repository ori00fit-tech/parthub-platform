import { Link } from "react-router-dom";
import BrandMark, { Wordmark } from "../brand/BrandMark";
import { useT } from "../../i18n";

// Seller portal (separate app). Override with VITE_SELLER_PORTAL_URL when a
// custom domain is set up.
const SELLER_PORTAL_URL = (import.meta.env.VITE_SELLER_PORTAL_URL || "https://parthub-platform-seller.pages.dev").replace(/\/$/, "");

function FooterColumn({ title, children }) {
  return (
    <div>
      <div className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white">{title}</div>
      <div className="space-y-3 text-sm text-faint">{children}</div>
    </div>
  );
}

const linkClass = "block hover:text-blue-300";

export default function Footer() {
  const t = useT();
  return (
    <footer className="mt-10 border-t border-line bg-[#0B1222] text-white">
      <div className="mx-auto grid max-w-[1380px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-5 lg:px-6">
        <div>
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-10 w-10" />
            <Wordmark />
          </div>

          <p className="mt-4 max-w-xs text-sm leading-7 text-faint">
            {t("Auto parts marketplace for Morocco. Search by vehicle, compare listings and buy from sellers reviewed by PartHub.")}
          </p>
        </div>

        <FooterColumn title={t("Shop")}>
          <Link to="/parts" className={linkClass}>{t("Browse All Parts")}</Link>
          <Link to="/vehicle-selector" className={linkClass}>{t("Shop by Vehicle")}</Link>
          <Link to="/request-part" className={linkClass}>{t("Request a part")}</Link>
          <Link to="/compare" className={linkClass}>{t("Compare Parts")}</Link>
        </FooterColumn>

        <FooterColumn title={t("Account")}>
          <Link to="/auth" className={linkClass}>{t("Sign In / Register")}</Link>
          <Link to="/orders" className={linkClass}>{t("My Orders")}</Link>
          <Link to="/requests" className={linkClass}>{t("My part requests")}</Link>
          <Link to="/vehicle-selector" className={linkClass}>{t("My Garage")}</Link>
          <Link to="/account" className={linkClass}>{t("My Account")}</Link>
        </FooterColumn>

        <FooterColumn title={t("Sellers")}>
          <a href={`${SELLER_PORTAL_URL}/auth`} className={linkClass}>{t("Sell on PartHub")}</a>
          <a href={SELLER_PORTAL_URL} className={linkClass}>{t("Seller Center")}</a>
          <Link to="/legal/seller" className={linkClass}>{t("Seller agreement")}</Link>
        </FooterColumn>

        <FooterColumn title={t("Policies")}>
          <Link to="/legal/terms" className={linkClass}>{t("Terms of use")}</Link>
          <Link to="/legal/returns" className={linkClass}>{t("Returns policy")}</Link>
          <Link to="/legal/privacy" className={linkClass}>{t("Privacy policy")}</Link>
        </FooterColumn>
      </div>

      <div className="border-t border-slate-800">
        <div className="mx-auto max-w-[1380px] px-4 py-5 text-xs text-faint sm:px-6 lg:px-6">
          {t("© {year} PartHub. All rights reserved.", { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  );
}
