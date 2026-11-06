// /parts/:slug — part page with its title, description, photo and schema.org
// Product data in the HTML (search results, WhatsApp/Facebook previews).
import {
  absoluteMedia, api, clip, conditionFr, conditionSchema, origin, plainShell, priceText, ratingSchema, renderShell, SITE_NAME,
} from "../_lib/seo.js";

function fitmentText(rows) {
  const list = (Array.isArray(rows) ? rows : [])
    .slice(0, 3)
    .map((r) => [r.make, r.generation || r.model, r.year_start ? (r.year_end && r.year_end !== r.year_start ? `${r.year_start}–${r.year_end}` : r.year_start) : ""].filter(Boolean).join(" "))
    .filter(Boolean);
  return list.length ? `Compatible : ${list.join(", ")}${rows.length > 3 ? "…" : ""}.` : "";
}

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const slug = String(params.slug || "");
  const url = `${origin(request)}/parts/${encodeURIComponent(slug)}`;
  try {
    const { status, data: part } = await api(env, `/api/v1/catalog/parts/${encodeURIComponent(slug)}`);
    if (!part) {
      if (status !== 404) return plainShell(context);
      return renderShell(context, {
        title: `Pièce introuvable | ${SITE_NAME}`,
        description: "Cette pièce n'est plus disponible sur PartHub.",
        url,
        noindex: true,
        status: 404,
      });
    }

    const price = priceText(part.price);
    const condition = conditionFr(part.condition);
    const inStock = Number(part.quantity) > 0;
    const images = [
      ...(Array.isArray(part.images) ? part.images.map((i) => i.url) : []),
      part.image_url,
    ].filter(Boolean).map((u) => absoluteMedia(env, u));
    const uniqueImages = [...new Set(images)].slice(0, 6);

    const title = clip(`${part.title}${price ? ` – ${price}` : ""} | ${SITE_NAME}`, 70);
    const description = clip(
      [
        `${part.title}${part.brand_name ? ` (${part.brand_name})` : ""}${condition ? `, pièce ${condition}` : ""}${price ? ` à ${price}` : ""}`,
        part.seller_name ? `chez ${part.seller_name}${part.seller_location ? ` à ${part.seller_location}` : ""}.` : ".",
        fitmentText(part.compatibility),
        inStock ? "Paiement à la livraison au Maroc." : "Actuellement en rupture de stock.",
      ].join(" ").replace(" .", "."),
      160
    );

    const product = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: part.title,
      description: clip(part.description || description, 500),
      url,
      ...(uniqueImages.length ? { image: uniqueImages } : {}),
      ...(part.sku ? { sku: part.sku, mpn: part.sku } : {}),
      ...(part.brand_name ? { brand: { "@type": "Brand", name: part.brand_name } } : {}),
      ...(part.category_name ? { category: part.category_name } : {}),
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: "MAD",
        price: (Number(part.price) / 100).toFixed(2),
        availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: conditionSchema(part.condition),
        ...(part.seller_name ? { seller: { "@type": "Organization", name: part.seller_name } } : {}),
        areaServed: { "@type": "Country", name: "MA" },
      },
    };
    const aggregate = ratingSchema(part.rating);
    if (aggregate) {
      product.aggregateRating = aggregate;
      product.review = (part.reviews || []).slice(0, 5).map((r) => ({
        "@type": "Review",
        reviewRating: { "@type": "Rating", ratingValue: Number(r.rating), bestRating: 5 },
        author: { "@type": "Person", name: r.author || "Acheteur" },
        ...(r.body ? { reviewBody: r.body } : {}),
        ...(r.created_at ? { datePublished: String(r.created_at).slice(0, 10) } : {}),
      }));
    }

    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: `${origin(request)}/` },
        { "@type": "ListItem", position: 2, name: "Pièces", item: `${origin(request)}/parts` },
        { "@type": "ListItem", position: 3, name: part.title, item: url },
      ],
    };

    return renderShell(context, {
      title,
      description,
      url,
      image: uniqueImages[0] || `${origin(request)}/og-image.png`,
      type: "product",
      jsonLd: [product, breadcrumb],
    });
  } catch {
    return plainShell(context);
  }
}
