// Landing pages (category, car make, car model, category for a model):
// title, description, breadcrumb and item list in the HTML, plus the parts
// as links, for search engines. Data: GET /api/v1/catalog/landing.
import { api, clip, escapeHtml, origin, plainShell, priceText, renderShell, SITE_NAME } from "./seo.js";

// French names of the categories (the catalog keeps them in English).
const CATEGORY_FR = {
  "body-exterior": "Carrosserie et extérieur",
  brakes: "Freinage",
  cooling: "Refroidissement",
  electrical: "Électricité et éclairage",
  "engine-parts": "Pièces moteur",
  exhaust: "Échappement",
  filters: "Filtres et fluides",
  interior: "Intérieur et accessoires",
  suspension: "Suspension et direction",
  "tires-wheels": "Pneus et jantes",
  tools: "Outillage",
  transmission: "Transmission",
};
export const categoryFr = (c) => (c ? CATEGORY_FR[c.slug] || c.name : "");

export function landingPath({ category, make, model }) {
  if (make) return `/voiture/${make}${model ? `/${model}` : ""}${category ? `/${category}` : ""}`;
  return `/pieces/${category}`;
}

function texts(d) {
  const cat = categoryFr(d.category);
  const car = [d.make?.name, d.model?.name].filter(Boolean).join(" ");
  const n = d.total;
  const count = n ? `${n} pièce${n > 1 ? "s" : ""}` : "Pièces";
  if (cat && car) {
    return {
      title: `${cat} ${car} – pièces auto au Maroc | ${SITE_NAME}`,
      description: `${count} ${cat.toLowerCase()} pour ${car}, neuves et d'occasion, chez des vendeurs vérifiés au Maroc. Paiement à la livraison.`,
    };
  }
  if (car) {
    return {
      title: `Pièces auto ${car} au Maroc | ${SITE_NAME}`,
      description: `${count} pour ${car} : moteur, freinage, filtres, suspension… neuves et d'occasion, chez des vendeurs vérifiés. Paiement à la livraison.`,
    };
  }
  return {
    title: `${cat} – pièces auto au Maroc | ${SITE_NAME}`,
    description: `${count} ${cat.toLowerCase()}, neuves et d'occasion, chez des vendeurs vérifiés au Maroc. Vérifiez la compatibilité avec votre voiture. Paiement à la livraison.`,
  };
}

function linkList(title, items, pathOf, labelOf) {
  if (!items?.length) return "";
  const li = items.map((x) => `<li><a href="${escapeHtml(pathOf(x))}">${escapeHtml(labelOf(x))}</a> (${Number(x.count) || 0})</li>`).join("");
  return `<h2>${escapeHtml(title)}</h2><ul>${li}</ul>`;
}

export async function landingResponse(context, slugs) {
  const { request, env } = context;
  const base = origin(request);
  const path = landingPath(slugs);
  const url = `${base}${path}`;
  try {
    const qs = new URLSearchParams(Object.entries(slugs).filter(([, v]) => v)).toString();
    const { status, data } = await api(env, `/api/v1/catalog/landing?${qs}`);
    if (!data) {
      if (status !== 404) return plainShell(context);
      return renderShell(context, {
        title: `Page introuvable | ${SITE_NAME}`,
        description: "Cette page n'existe pas sur PartHub.",
        url,
        noindex: true,
        status: 404,
      });
    }

    // Canonical address from the catalog's own slugs (lower case).
    const canonical = `${base}${landingPath({ make: data.make?.slug, model: data.model?.slug, category: data.category?.slug })}`;
    const { title, description } = texts(data);
    const car = [data.make?.name, data.model?.name].filter(Boolean).join(" ");
    const parts = Array.isArray(data.parts) ? data.parts : [];

    const crumbs = [{ name: SITE_NAME, path: "/" }];
    if (data.make) crumbs.push({ name: data.make.name, path: landingPath({ make: data.make.slug }) });
    if (data.model) crumbs.push({ name: data.model.name, path: landingPath({ make: data.make.slug, model: data.model.slug }) });
    if (data.category) crumbs.push({ name: categoryFr(data.category), path: canonical.slice(base.length) });
    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${base}${c.path}` })),
    };
    const jsonLd = [breadcrumb];
    if (parts.length) {
      jsonLd.push({
        "@context": "https://schema.org",
        "@type": "ItemList",
        numberOfItems: data.total,
        itemListElement: parts.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${base}/parts/${encodeURIComponent(p.slug)}`, name: p.title })),
      });
    }

    const content = [
      data.generations?.length
        ? `<p>Générations : ${data.generations.map((g) => escapeHtml(`${g.name} (${g.year_start}–${g.year_end || "…"})`)).join(", ")}</p>`
        : "",
      parts.length
        ? `<h2>${escapeHtml(car ? `Pièces pour ${car}` : "Pièces disponibles")}</h2><ul>${parts
            .map((p) => `<li><a href="/parts/${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a>${p.price ? ` – ${escapeHtml(priceText(p.price))}` : ""}${p.seller_location ? ` · ${escapeHtml(p.seller_location)}` : ""}</li>`)
            .join("")}</ul>`
        : "<p>Aucune pièce en ligne pour le moment. Envoyez une demande : les vendeurs vous répondent avec leurs offres.</p>",
      linkList(
        "Modèles",
        data.models,
        (m) => landingPath({ make: data.make.slug, model: m.slug }),
        (m) => `${data.make.name} ${m.name}`
      ),
      linkList("Marques de voiture", data.makes, (m) => landingPath({ make: m.slug, category: data.category?.slug }), (m) => m.name),
      linkList(
        "Catégories",
        data.categories,
        (c) => (data.make ? landingPath({ make: data.make.slug, model: data.model?.slug, category: c.slug }) : landingPath({ category: c.slug })),
        (c) => `${categoryFr(c)}${car ? ` ${car}` : ""}`
      ),
    ].join("");

    return renderShell(context, {
      title: clip(title, 70),
      description: clip(description, 160),
      url: canonical,
      image: `${base}/og-image.png`,
      jsonLd,
      // A page without parts is thin: keep it out of the index.
      noindex: !data.total,
      content,
    });
  } catch {
    return plainShell(context);
  }
}
