// /help — the questions and answers in the HTML for search engines, with
// FAQPage structured data (French, the site's default language; the page
// itself shows the visitor's language). Texts: src/content/help.js.
import { origin, plainShell, renderShell, escapeHtml } from "./_lib/seo.js";
import { HELP } from "../src/content/help.js";

export async function onRequestGet(context) {
  try {
    const base = origin(context.request);
    const help = HELP.fr;
    const items = help.sections.flatMap((s) => s.items);
    return renderShell(context, {
      title: "Aide et questions fréquentes | PartHub",
      description: "Commander une pièce auto, payer à la livraison, suivre la commande, retourner une pièce sous 7 jours, vendre sur PartHub : les réponses.",
      url: `${base}/help`,
      image: `${base}/og-image.png`,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
        },
      ],
      content: help.sections
        .map((s) => `<h2>${escapeHtml(s.title)}</h2>` + s.items.map((i) => `<h3>${escapeHtml(i.q)}</h3><p>${escapeHtml(i.a)}</p>`).join(""))
        .join(""),
    });
  } catch {
    return plainShell(context);
  }
}
