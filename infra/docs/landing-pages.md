# Landing pages (SEO)

Pages search engines can index for the searches buyers type ("plaquettes
Dacia Logan", "pièces Renault Clio"):

| Path | Example |
| --- | --- |
| `/pieces/:category` | `/pieces/filters` |
| `/voiture/:make` | `/voiture/dacia` |
| `/voiture/:make/:model` | `/voiture/dacia/logan` |
| `/voiture/:make/:model/:category` | `/voiture/dacia/logan/brakes` |

- Data: `GET /api/v1/catalog/landing?category=&make=&model=`
  (`workers/api/src/utils/landing.ts`). Slugs are the vehicle catalog's and
  the categories'; an unknown slug is a 404.
- A part belongs to a car page when it has a compatibility row for that make
  (and model), names compared without case.
- First load: `apps/storefront/functions/_lib/landing.js` writes the French
  title, description, canonical, BreadcrumbList / ItemList and the parts as
  links into the HTML. A page with no parts is `noindex`.
- `sitemap.xml` lists every landing page with at least one part
  (`landings` in `/api/v1/catalog/sitemap`).
- Internal links: the footer's categories, the category chip and the
  vehicle rows on the part page.
