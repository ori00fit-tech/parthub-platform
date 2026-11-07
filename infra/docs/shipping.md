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
- Orders placed before 0022 keep their flat fee (moved to the first
  shipment row when a seller ships).

## Later: carriers (needs signed contracts)
1. Contract + API docs from one carrier → `utils/carriers/<name>.ts`:
   create shipment, label, tracking webhook; fills the same
   `order_shipments` columns (+ status / cost columns then).
2. Fees from the carrier's price grid (weight `parts.weight_kg`, zones).
3. If PartHub collects the money (carrier COD remitted to PartHub):
   ledger + seller payouts before going live.
Heavy parts stay "pickup only" until a heavy-cargo partner exists.
