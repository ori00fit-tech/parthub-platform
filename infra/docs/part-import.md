# Bulk part import (sellers)

Seller portal: Inventory › "Import from a spreadsheet" (`/parts/import`).

1. The seller downloads the template (`;`-separated CSV with a UTF-8 BOM so
   Excel keeps the accents), fills one line per part, saves as CSV.
2. The browser reads the file (`apps/seller-portal/src/lib/csv.js`: quotes,
   `;` `,` or tab, UTF-8 or Windows-1252) and sends the rows in chunks of 50
   with `dry_run: true`: the page lists each line's errors and warnings.
3. "Import" sends the same chunks for real.

API: `POST /api/v1/marketplace/me/parts/import`
`{ rows: [{ column: value }], first_row, dry_run }` →
per line `{ row, action: create | update | error, title, part_id, errors, warnings }`
(messages are `{ text, params }`, translated by the seller portal).
Code: `workers/api/src/utils/part-import.ts`.

Rules:
- Column names in French, English or Arabic (`Titre`/`title`/`العنوان`...).
- Required for a new part: title, category (slug, English name or a French /
  Arabic alias), price in MAD (`350`, `1 200,50`).
- A reference (SKU) that matches one of the seller's parts (not archived)
  updates **price and stock only**. Re-importing the same file is safe for
  lines with a reference; lines without one create new parts again.
- New parts are `pending` (moderation), like the form.
- Vehicles: `Make Model years` or `Make Generation` (years from the
  catalog), separated by `;`; unknown ones are skipped with a warning.
  Engine left unspecified (buyers are asked to check it).
- Brand must exist in the catalog (else left empty, warning). OEM numbers:
  `own` for OEM / used parts, `replaces` for aftermarket.
- Lines with errors are never written. Each chunk is one D1 batch (all its
  valid lines or none) and costs ~10 queries, within the Free plan's 50.
- Stock going from 0 to more triggers back-in-stock alerts.
