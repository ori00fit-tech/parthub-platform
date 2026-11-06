import { useEffect } from "react";

// Title and description while navigating inside the app. The first load of
// part and store pages gets them from the server (functions/), so search
// engines and link previews see them without running JavaScript.
const SITE = "PartHub";
// Same defaults as index.html, restored when a page with its own title closes.
const DEFAULT_TITLE = "PartHub – Pièces auto au Maroc | قطع غيار السيارات";
const DEFAULT_DESCRIPTION =
  "Trouvez la bonne pièce auto pour votre véhicule au Maroc : neuve, d'origine ou d'occasion, chez des vendeurs vérifiés. Paiement à la livraison.";

function setDescription(text) {
  const tag = document.querySelector('meta[name="description"]');
  if (tag && text) tag.setAttribute("content", String(text).replace(/\s+/g, " ").trim().slice(0, 160));
}

export function usePageMeta(title, description) {
  useEffect(() => {
    if (!title) return;
    document.title = title.includes(SITE) ? title : `${title} | ${SITE}`;
    setDescription(description);
    return () => {
      document.title = DEFAULT_TITLE;
      setDescription(DEFAULT_DESCRIPTION);
    };
  }, [title, description]);
}
