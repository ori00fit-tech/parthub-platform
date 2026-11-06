// / — home page: WebSite (with the site search box) and Organization data.
import { origin, plainShell, renderShell, SITE_NAME } from "./_lib/seo.js";

export async function onRequestGet(context) {
  try {
    const base = origin(context.request);
    return renderShell(context, {
      title: "PartHub – Pièces auto au Maroc | قطع غيار السيارات",
      description:
        "Trouvez la bonne pièce auto pour votre véhicule au Maroc : neuve, d'origine ou d'occasion, chez des vendeurs vérifiés. Paiement à la livraison.",
      url: `${base}/`,
      image: `${base}/og-image.png`,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: `${base}/`,
          inLanguage: ["fr-MA", "ar-MA"],
          potentialAction: {
            "@type": "SearchAction",
            target: { "@type": "EntryPoint", urlTemplate: `${base}/parts?q={search_term_string}` },
            "query-input": "required name=search_term_string",
          },
        },
        { "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url: `${base}/`, logo: `${base}/favicon.svg` },
      ],
    });
  } catch {
    return plainShell(context);
  }
}
