# How buyers get their parts (delivery, pickup, courier)

Migration `0020_fulfillment_methods.sql`, logic in `workers/api/src/utils/pickup.ts`.

| Method | Seller steps | Buyer |
| --- | --- | --- |
| `delivery` | confirm → ship → mark delivered | address + flat delivery fee, cash on delivery |
| `pickup` | **confirm = reserve** (kept 3 days, `pickup_until`) → **collected with the buyer's 6-digit code** | store address and hours, inspects the part, pays there, may refuse it |
| `courier` | same as pickup | someone the buyer sends, with the code (optional name / phone) |

- Seller settings (store page): `delivery_enabled`, `pickup_enabled`,
  `pickup_address` (required for pickup), `pickup_hours`
  (`PUT /api/v1/marketplace/me/fulfillment`). A part can be pickup only
  (`parts.delivery_available = 0`, `PUT /me/parts/:id/fulfillment`).
- Checkout asks `GET /api/v1/commerce/fulfillment-options?parts=…` and sends
  `fulfillment: { [seller_id]: { method, collector_name?, collector_phone? } }`.
  All lines of one seller share the method and the code. The address and the
  delivery fee are needed only when something is delivered.
- The code is on the buyer's order page only (never in seller APIs). The
  seller enters it to mark the lines delivered (starts the 7-day returns
  window). 5 wrong codes lock it (423): PartHub closes the order from admin.
- Refused at the store or not collected after `pickup_until`: the seller
  cancels with a reason; the stock comes back.
- Payment stays independent: cash, on delivery or at the store.

Later: pickup points, heavy cargo (weight / size pricing), courier partners.
