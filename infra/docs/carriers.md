# Carriers: one integration for every delivery company

Code: `workers/api/src/utils/carriers.ts`, `routes/carriers.ts`, admin
routes in `routes/admin.ts`; data: migration `0026_carriers.sql`; screen:
Admin › **Carriers**.

## What works for every carrier, today
- **Carriers are data, not code.** 12 are created by 0026 (Amana, CTM,
  Sendit, Forcelog, Olivraison, Ozon Express, Cathedis, Chronopost Maroc,
  DHL, Aramex, own driver, other). Admin › Carriers adds others (code +
  name) and hides those no seller uses. Sellers choose from the active ones
  when they mark an order shipped (`GET /api/v1/carriers`).
- **Public tracking link** per carrier (`https://…{tracking}…`): the buyer
  gets a "Track my parcel" button, the seller a clickable number.
- **Status updates by webhook**, one address per carrier:
  `POST https://api.parthub.autos/api/v1/carriers/<code>/webhook`.
  JSON or form body, one event or a list. Read with the carrier's
  **field map** and **status map** (below), deduplicated, put on the
  shipment's timeline, and they act on the order:
  | PartHub status | Effect |
  |---|---|
  | `delivered` | the seller's shipped lines become delivered (proof from the carrier: `carrier_delivered_at`, COD collected), the 7-day returns window starts |
  | `returned` | the lines are closed as a failed delivery: stock back once, buyer pays nothing |
  | `failed_attempt` | counted (`attempts`), noted on the order |
  | others (`picked_up`, `in_transit`, `out_for_delivery`, `returning`, `created`, `cancelled`) | timeline and current status |
  A final status (delivered / returned / cancelled) wins over an
  in-progress one whatever the clocks say; an in-progress one never
  replaces a final one. Tracking numbers match whatever the formatting
  (`SD-3003` = `sd 3003`).
- The seller's own actions (shipped, delivered, delivery failed) go on the
  same timeline.
- **Carriers without a webhook (most today): updates by hand.** On the
  order page the seller records what the carrier tells them ("Carrier
  update": picked up, on the way, out for delivery, failed attempt — reason
  required, being returned, returned) —
  `POST /api/v1/marketplace/me/orders/:id/shipment`. PartHub can do the
  same, delivered with the cash collected included, from Admin › Carriers ›
  Late shipments (`POST /api/v1/admin/orders/:id/shipment`). Same timeline,
  same effects as the webhook (returned: lines cancelled, stock back once).
- **The seller's own choices** (seller portal › Store › "Shipping: my
  carriers and options", `GET/PUT /api/v1/marketplace/me/shipping`,
  migration 0037): the carriers they work with (their customer number at
  each, one by default). The ship form offers only those, default
  preselected; with none chosen, every active carrier. Also: **free
  delivery from an amount** (the fee is 0 when the buyer's parts from that
  store reach it: checkout and order charge the same) and **delivery times**
  in their city / elsewhere, shown on the part page and at checkout.
- **What each status sends on WhatsApp** (`utils/wa-events.ts`,
  `whatsapp-templates.md`):
  | Status | Buyer | Seller |
  |---|---|---|
  | shipped (seller) | order shipped, carrier, tracking | — |
  | `picked_up`, `in_transit` | — (timeline only, saves messages) | — |
  | `out_for_delivery` | out for delivery, cash to prepare | — |
  | `failed_attempt` | each attempt, with the reason; replying reaches the PartHub inbox | — |
  | `returning` | going back to the seller, reply if still wanted | — |
  | `returned` | — | parcel returned, stock back |
  | `delivered` | delivered, 7 days to report a problem | delivered, cash collected |
- **Late shipments**: a shipped parcel with no update for 4 days
  (`utils/shipping-delays.ts`, `LATE_DAYS`). The daily job (03:17 UTC)
  tells the buyer and the seller once, notes it on the order
  (`shipping_delayed`), and Admin › Carriers lists it to follow up. The
  next update clears it (a new quiet period can be reported again).

## Connecting a carrier (about 15 minutes, no code)
1. Ask the carrier for: its webhook / callback option, a sample payload,
   its list of statuses, its public tracking page.
2. Admin › Carriers › the carrier › Set up:
   - tracking link, e.g. `https://its-site/track?number={tracking}`;
   - **field map** — where its JSON keeps each field (dot paths):
     ```json
     { "events": "data.parcels", "tracking": "code", "status": "state",
       "cod": "amount", "cod_unit": "mad", "time": "updated_at", "note": "comment" }
     ```
     Empty = PartHub looks for the usual names (`tracking_number`,
     `status`, `cod_amount`, `updated_at`, also under `data.`…);
   - **status map** — only for words PartHub does not already know
     (it knows the usual French / English / Arabic ones: livré, non livré,
     injoignable, refusé, en cours de livraison, retour, تم التسليم…):
     ```json
     { "7": "returned", "LIV_OK": "delivered" }
     ```
   - paste the carrier's sample in **Test a webhook**: you see each event
     read, its PartHub status and the order it would update. Nothing is
     saved.
3. Create the secret (16+ characters), as a Worker secret, never in the
   database:
   `cd workers/api && npx wrangler secret put CARRIER_<CODE>_WEBHOOK_SECRET`
   (the exact name is shown on the screen).
4. Give the carrier the webhook address and the secret. It either signs
   each call (`X-PartHub-Signature: sha256=<HMAC-SHA256 of the body>`) or,
   if it can only send a fixed URL, appends `?token=<secret>`.
5. Tick **Receive its status updates** and save. The list shows the
   updates of the last 7 days and those that matched no order.

Without a secret the webhook answers 404; a wrong signature or token, 401.

## Later: creating shipments at the carrier (its API)
`CarrierClient` in `utils/carriers.ts` (`createShipment`,
`cancelShipment`). For a carrier with a documented API and a contract:
implement it in `utils/carriers/<code>.ts`, register it in `API_CLIENTS`,
set the carrier's `api_client`, keep its API key as a Worker secret. Until
then (`api_client = manual`) the seller books the parcel with the carrier
and types the tracking number.
