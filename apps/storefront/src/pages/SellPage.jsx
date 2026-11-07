import { Link } from "react-router-dom";
import { Icon } from "@parthub/shared/icons";
import { LEGAL_CONTACT_EMAIL } from "@parthub/shared/legal";
import { useT } from "../i18n";
import { usePageMeta } from "../lib/pageMeta";

// "Sell on PartHub": what sellers get, how to start, the rules. Every point
// describes something the platform does today (no made-up figures).
const SELLER_PORTAL_URL = (import.meta.env.VITE_SELLER_PORTAL_URL || "https://seller.parthub.autos").replace(/\/$/, "");
const SIGNUP_URL = `${SELLER_PORTAL_URL}/auth?mode=signup`;

const BENEFITS = [
  { icon: "vehicle", title: "Buyers who search by their car", text: "You choose the generation and engine your part fits. Buyers who enter their car see your part first, marked as fitting." },
  { icon: "requests", title: "Part requests from buyers", text: "A buyer looking for a part you have sends a request: you receive it and answer with your price." },
  { icon: "oem", title: "Found by part number", text: "Add the original (OEM) numbers: buyers searching a number find your part, next to the other offers for the same reference." },
  { icon: "orders", title: "Simple order handling", text: "Confirm, ship, mark as delivered. The buyer's phone and WhatsApp are on the order, with the amount to collect on delivery." },
  { icon: "insights", title: "Know what buyers look for", text: "See the most searched parts and cars, and the searches that found nothing: parts worth having in stock." },
  { icon: "verified", title: "Trust that sells", text: "Your store is checked by PartHub, and only buyers who received their order can leave a review." },
];

const STEPS = [
  { title: "Create your account", text: "Name, phone and email. It takes two minutes." },
  { title: "Set up your store", text: "Store name, city, WhatsApp number, and accept the seller agreement." },
  { title: "Add your parts", text: "A step-by-step form: photos from your phone, price, condition, part numbers and the vehicles it fits." },
  { title: "Go live", text: "PartHub checks your store, then your parts appear to buyers across Morocco." },
];

const FAQ = [
  { q: "Who can sell on PartHub?", a: "Parts shops, importers, distributors, dismantlers and individuals selling auto parts in Morocco, new or used." },
  { q: "How much does it cost?", a: "Selling is free during the launch. If paid plans or commissions come later, you will be told at least 30 days before they apply to you, and you can close your store at any time." },
  { q: "How do I get paid?", a: "The buyer pays you directly, cash on delivery. The order page shows the amount to collect." },
  { q: "Who delivers the parts?", a: "You do, with your usual delivery company or driver. You update the order when it is shipped and delivered." },
  { q: "What about returns?", a: "Buyers can report a problem within 7 days of delivery. You pay the return only when the problem comes from your side (wrong part sent, damaged, not as described). PartHub decides if you disagree." },
  { q: "Can I sell used parts?", a: "Yes. Say the condition honestly and add real photos: buyers trust detailed listings more." },
];

export default function SellPage() {
  const t = useT();
  usePageMeta(t("Sell your auto parts on PartHub"), t("Shops, importers and dismantlers: list your auto parts for free and receive orders and part requests from buyers across Morocco."));

  const cta = (
    <a href={SIGNUP_URL} className="btn-cta inline-flex h-12 items-center rounded-2xl px-6 text-sm">
      {t("Open my store, free")}
    </a>
  );

  return (
    <div className="space-y-10 pb-12">
      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0B1222] via-navy-night to-navy-deep p-6 text-white shadow-lg sm:p-10">
        <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-navy-ink">{t("For parts sellers")}</p>
        <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">{t("Sell your auto parts to buyers across Morocco")}</h1>
        <p className="mt-4 max-w-2xl text-base text-navy-ink">
          {t("Shops, importers and dismantlers: list your parts for free and receive orders and part requests from buyers who know their car.")}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {cta}
          <a href="#how" className="inline-flex h-12 items-center rounded-2xl border border-white/20 px-5 text-sm font-semibold text-white hover:bg-white/10">
            {t("How it works")}
          </a>
          <a href={`${SELLER_PORTAL_URL}/auth`} className="text-sm font-semibold text-navy-ink underline-offset-4 hover:underline">
            {t("Already a seller? Sign in")}
          </a>
        </div>
        <ul className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
          {["Free to start", "Cash on delivery", "Arabic, French and English"].map((x) => (
            <li key={x} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
              <Icon name="ok" className="h-3.5 w-3.5 text-emerald-300" />
              {t(x)}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-ink">{t("What you get")}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <article key={b.title} className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-navy/[0.08] text-link">
                <Icon name={b.icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-base font-bold text-ink">{t(b.title)}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted">{t(b.text)}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="scroll-mt-24 rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-ink">{t("How it works")}</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl bg-surface-2 p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">{i + 1}</span>
              <h3 className="mt-3 font-bold text-ink">{t(s.title)}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{t(s.text)}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6">{cta}</div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-bold text-ink">{t("The rules, in short")}</h2>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-ink-2">
            {[
              "Describe each part honestly, with real photos.",
              "Confirm or cancel each order within 2 working days.",
              "Answer return claims within 2 working days.",
              "No stolen, counterfeit or dangerous parts.",
            ].map((r) => (
              <li key={r} className="flex gap-2">
                <Icon name="ok" className="mt-1 h-4 w-4 flex-none text-emerald-600" />
                {t(r)}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            <Link to="/legal/seller" className="font-semibold text-link hover:underline">{t("Seller agreement")}</Link>
            {" · "}
            <Link to="/legal/returns" className="font-semibold text-link hover:underline">{t("Returns policy")}</Link>
          </p>
        </div>

        <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-bold text-ink">{t("Questions")}</h2>
          <div className="mt-3 divide-y divide-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink">
                  {t(f.q)}
                  <span aria-hidden="true" className="text-faint transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm leading-6 text-muted">{t(f.a)}</p>
              </details>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">
            {t("Another question? Write to us:")}{" "}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} dir="ltr" className="font-semibold text-link hover:underline">{LEGAL_CONTACT_EMAIL}</a>
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-surface-2 p-6 text-center sm:p-8">
        <h2 className="text-2xl font-bold text-ink">{t("Your parts deserve more buyers")}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted">{t("Open your store today: it's free, and your first parts can be online in a few minutes.")}</p>
        <div className="mt-5 flex justify-center">{cta}</div>
      </section>
    </div>
  );
}
