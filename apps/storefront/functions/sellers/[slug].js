// /sellers/:slug — public store page with its name, city, rating and
// schema.org AutoPartsStore data in the HTML.
import { api, clip, origin, plainShell, ratingSchema, renderShell, SITE_NAME } from "../_lib/seo.js";

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const slug = String(params.slug || "");
  const url = `${origin(request)}/sellers/${encodeURIComponent(slug)}`;
  try {
    const { status, data: seller } = await api(env, `/api/v1/storefront/sellers/${encodeURIComponent(slug)}`);
    if (!seller) {
      if (status !== 404) return plainShell(context);
      return renderShell(context, {
        title: `Vendeur introuvable | ${SITE_NAME}`,
        description: "Ce vendeur n'est pas disponible sur PartHub.",
        url,
        noindex: true,
        status: 404,
      });
    }

    const count = Number(seller.active_parts_count || 0);
    const title = clip(`${seller.name}${seller.location ? ` – ${seller.location}` : ""} | Pièces auto ${SITE_NAME}`, 70);
    const description = clip(
      `${seller.name}${seller.location ? `, ${seller.location}` : ""} : ${count} pièce${count > 1 ? "s" : ""} auto en ligne sur PartHub. ${
        seller.description ? seller.description : "Vérifiez la compatibilité avec votre véhicule et commandez avec paiement à la livraison."
      }`,
      160
    );
    const logo = seller.logo_url && !seller.logo_url.startsWith("/") ? seller.logo_url : undefined;

    const store = {
      "@context": "https://schema.org",
      "@type": "AutoPartsStore",
      name: seller.name,
      url,
      ...(seller.description ? { description: clip(seller.description, 500) } : {}),
      ...(logo ? { image: logo, logo } : {}),
      ...(seller.location ? { address: { "@type": "PostalAddress", addressLocality: seller.location, addressCountry: "MA" } } : {}),
      ...(seller.phone ? { telephone: seller.phone } : {}),
    };
    const aggregate = ratingSchema(seller.rating);
    if (aggregate) store.aggregateRating = aggregate;

    return renderShell(context, { title, description, url, image: logo || `${origin(request)}/og-image.png`, type: "profile", jsonLd: [store] });
  } catch {
    return plainShell(context);
  }
}
