# Shipping: delivery fees and shipments (phase 0)

Migration `0022_shipping_fees.sql`, logic in `workers/api/src/utils/shipping.ts`.
Delivery / pickup / courier choice: see `fulfillment-methods.md`.

## Today: the seller ships
- Each seller sets two fees in store settings: **in their city** and **to
  other cities** (MAD; empty = `SHIPPING_FEE_CENTIMES`, 35 MAD; 0 = free).
  The city match ignores accents and knows common spellings ("Casa",
  "الدار البيضاء" = Casablanca).
- Checkout shows each delivering seller's fee for the buyer's city
  (`GET /commerce/fulfillment-options?parts=…&city=…`) and the sum.
- An order has one `order_shipments` row per seller: method, the fee that
  seller collects, carrier, tracking number, shipped date.
  `orders.shipping_fee` = fees of sellers who still have open lines
  (a seller who cancels takes their fee off the total).
- Cash on delivery: the buyer pays each seller their parts + that seller's
  fee; the seller's order page shows the exact amount.
- "Mark as shipped" asks the carrier (own driver, Amana, CTM, Sendit,
  Forcelog, Olivraison, other) and an optional tracking number; the buyer
  sees both.
- Sending "shipped" again without a carrier keeps the carrier and
  tracking number already saved.
- **Delivery failed** (buyer refused, unreachable, parcel back): from
  "shipped" the seller can close the order with a reason. Quantities go
  back to stock, the seller's fee leaves the total, the history shows
  `delivery_failed` with the reason (the buyer sees it).
- **Not received**: if a seller marks a line delivered but the buyer has
  nothing, the buyer opens a claim "I did not receive the part" (within
  the 7 days). An open claim blocks the commission until it is resolved.
- Orders placed before 0022 keep their flat fee (moved to the first
  shipment row when a seller ships).

## Carriers
Carriers are a table managed in Admin › Carriers, with tracking links and
status webhooks for every carrier: see `infra/docs/carriers.md`.
Still to do per carrier, once there is a contract and API documentation:
creating the shipment and the label from PartHub (CarrierClient), fees
from its price grid, and — if the carrier collects for PartHub — COD
remittance and seller payouts.
Heavy parts stay "pickup only" until a heavy-cargo partner exists.
