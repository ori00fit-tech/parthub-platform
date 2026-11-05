import { Fragment } from "react";
import { Link } from "react-router-dom";
import { useT } from "../../i18n";

// A translated sentence whose [bracketed] parts become links, in order:
// "By placing your order, you accept the [Terms of use] and the [Returns policy]."
export function LinkedText({ text, links, linkClassName = "font-semibold text-link hover:underline" }) {
  let n = 0;
  return text.split(/(\[[^\]]+\])/).map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]$/);
    if (!m) return <Fragment key={i}>{part}</Fragment>;
    const to = links[n++];
    return to ? (
      <Link key={i} to={to} target="_blank" rel="noopener" className={linkClassName}>
        {m[1]}
      </Link>
    ) : (
      <Fragment key={i}>{m[1]}</Fragment>
    );
  });
}

// Shown under "Create account" and "Place order".
export default function LegalConsent({ kind = "account", className = "" }) {
  const t = useT();
  const text =
    kind === "order"
      ? t("By placing your order, you accept the [Terms of use] and the [Returns policy].")
      : t("By creating an account, you accept the [Terms of use] and the [Privacy policy].");
  const links = kind === "order" ? ["/legal/terms", "/legal/returns"] : ["/legal/terms", "/legal/privacy"];
  return (
    <p className={["text-xs leading-5 text-muted", className].join(" ")}>
      <LinkedText text={text} links={links} />
    </p>
  );
}
