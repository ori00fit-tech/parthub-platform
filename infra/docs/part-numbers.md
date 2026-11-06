# Part numbers (OEM and aftermarket references)

Migration `0019_part_numbers.sql`, logic in `workers/api/src/utils/part-numbers.ts`.

| Table | Content |
|---|---|
| `part_numbers` | A reference once: `number` as written ("7701 208 174"), `number_norm` for search ("7701208174": A–Z and 0–9 only), `kind` `oem` (car maker's original, no brand) or `aftermarket` (`brand_id` = parts maker). Unique on (number_norm, brand). |
| `part_listing_numbers` | Listing ↔ number. `role` `own` (the part carries this number) or `replaces` (the seller says it replaces this original number). |
| `part_number_links` | Two numbers that are the same part: `equivalent`, or `supersedes` (new number replacing an old one). `verification`: `unverified`, `verified`, `admin_approved`, `rejected`. |

## Rules
- A seller's listing: OEM numbers are `own` for an original or used part,
  `replaces` for an aftermarket part; the maker's number is `own` with the
  listing's brand.
- A listing's own numbers × the numbers it replaces create **unverified**
  `equivalent` links (source `seller_claim`). The claim counts for that
  listing at once (search by the original number finds it, shown as
  "replaces … according to the seller").
- A link counts for **every** listing (search, "other offers") only once an
  admin verifies it (admin page "Part numbers"). Admins can also add
  verified links directly.
- Search (`/api/v1/search?q=`): a query of 4+ letters/digits also matches
  listings carrying that number, or a number linked to it by a verified
  link (one step), and the old `parts.sku` compared without spaces/dashes.
  Number matches rank first.
- Part page (`GET /catalog/parts/:slug`): `part_numbers` and `other_offers`
  (active listings of active stores with the same number, or a verified
  equivalent; in stock first, then cheapest).
- `parts.sku` stays the seller's own stock code.
