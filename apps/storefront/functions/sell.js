// /sell — "Sell on PartHub": title and description in the HTML for search
// engines and link previews (the page is shared with sellers on WhatsApp).
import { origin, plainShell, renderShell } from "./_lib/seo.js";

export async function onRequestGet(context) {
  try {
    const base = origin(context.request);
    return renderShell(context, {
      title: "Vendez vos pièces auto sur PartHub | بِع قطع غيار السيارات",
      description:
        "Magasins, importateurs et casses : publiez vos pièces auto gratuitement et recevez des commandes et des demandes de pièces d'acheteurs partout au Maroc.",
      url: `${base}/sell`,
      image: `${base}/og-image.png`,
      content: [
        "<h2>Comment ça marche</h2>",
        "<ol><li>Créez votre compte vendeur.</li><li>Configurez votre magasin : nom, ville, WhatsApp.</li><li>Ajoutez vos pièces : photos, prix, état, références et véhicules compatibles.</li><li>PartHub vérifie votre magasin, puis vos pièces sont visibles partout au Maroc.</li></ol>",
        '<p><a href="https://seller.parthub.autos/auth?mode=signup">Ouvrir mon magasin gratuitement</a></p>',
      ].join(""),
    });
  } catch {
    return plainShell(context);
  }
}
