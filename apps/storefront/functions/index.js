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
      content: [
        "<h2>Pièces auto neuves, d'origine et d'occasion</h2>",
        "<p>Indiquez votre voiture (marque, modèle, génération, moteur) pour voir les pièces compatibles, ou cherchez par référence d'origine (OEM). Les vendeurs sont vérifiés par PartHub et vous payez à la livraison, partout au Maroc.</p>",
        "<h2>قطع غيار السيارات في المغرب</h2>",
        '<p dir="rtl" lang="ar">اختر سيارتك لترى القطع المتوافقة معها، أو ابحث برقم القطعة الأصلي. البائعون موثَّقون من PartHub والدفع عند الاستلام في كل المغرب.</p>',
      ].join(""),
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
