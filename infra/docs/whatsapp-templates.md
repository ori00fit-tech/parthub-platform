# WhatsApp templates — Arabic, French, English

The one list is `workers/api/src/utils/wa-templates.ts`: every template
PartHub sends, the event that sends it, who receives it, its variables
and its text in the three languages. The API sends from it, the admin
**WhatsApp › Templates** page shows it and submits it to Meta, and the test
`workers/api/test/wa-templates.test.mjs` checks it (Meta's rules, and that
every template has an event in the code). Set-up of the number and the
webhook: `whatsapp.md`.

## How a message is sent
1. An event happens (order placed, shipped, claim answered…), and is saved.
2. After the response, `notify()` (`utils/wa-notify.ts`) records the
   message once per event and person (a retry never sends twice).
3. Language: the one the person uses PartHub in (`users.locale`, sent by
   the three sites with each signed-in request). If Meta has not approved
   that version: French, then Arabic, then English. If no version is
   approved, nothing goes to Meta and the reason is logged
   (`whatsapp_notifications.status = 'skipped'`, `error`).
4. People who wrote STOP get nothing (logged too).

The first five templates (`legacy` in the catalog) were registered in
French before the catalog: until Meta's status is read once, they keep
going out in `WHATSAPP_TEMPLATE_LANG` as before.

## Submitting them to Meta
- **From the admin (recommended)**: add the Worker secret
  `WHATSAPP_BUSINESS_ACCOUNT_ID` (Meta › WhatsApp Manager › Account tools,
  or API Setup: "WhatsApp Business Account ID"):

  ```bash
  cd workers/api && npx wrangler secret put WHATSAPP_BUSINESS_ACCOUNT_ID
  ```

  The access token must be allowed to manage templates
  (`whatsapp_business_management`; a System User token with the WhatsApp
  permissions has it). Then Admin › WhatsApp › Templates › **Submit the
  missing ones to Meta** (in batches of 20) and **Read statuses from
  Meta** a little later.
- **By hand**: create each template in WhatsApp Manager › Message
  templates, category **Utility**, with the name, language, text, footer
  and button shown on the admin page (copy buttons), then set its status
  on the page when Meta approves it.

Rules the catalog follows: Utility category (each message is about the
person's own order, request, claim, store or account), no variable at the
start or end of a text, no two variables side by side, a footer "Reply
STOP…", a URL button `https://parthub.autos/{{1}}` (or the seller portal)
whose `{{1}}` is the page path. A rejected template: fix its text in the
catalog, deploy, then **Submit to Meta** for that language on the page.

Cost: Meta charges each Utility template message sent outside the 24-hour
window (Morocco price list). The catalog only has messages tied to a real
step of an order, a claim, a store or an account.

## Not in the catalog (on purpose)
| Asked | Why not now |
|---|---|
| Welcome / registration confirmation | No step of a transaction: costs a message for nothing, and needs the person's agreement first |
| Phone number check (OTP) | PartHub has no phone verification yet; would be an Authentication template when it does |
| Online payment confirmation | Cash on delivery only; "out for delivery" gives the amount to prepare |
| Seller settlement | No settlement ledger yet (`infra/docs/revenue.md`); "delivered by the carrier" gives the cash collected |
| Price drop, new offers, promotions | Marketing category: opt-in needed, higher price |
| Low stock | The seller sees it in the portal |
| Support tickets | The claim (returns) flow is the support flow; replies go through the admin inbox |
| Admin alerts | The admin dashboard shows them; failed messages are on the Templates page |
| Darija | Meta has no Darija language code: it would be the `ar` text written in Darija, or a fourth version later |

## The templates
| Template | To | Sent when | Variables | Button |
|---|---|---|---|---|
| `parthub_new_request` | Seller | A buyer posts a part request that matches the store (make or category) | {{1}} part, {{2}} vehicle, {{3}} city, {{4}} link | link in text |
| `parthub_new_offer` | Buyer | A seller sends the first offer on the buyer's part request | {{1}} part, {{2}} seller, {{3}} price, {{4}} link | link in text |
| `parthub_offer_accepted` | Seller | The buyer accepts the seller's offer | {{1}} part, {{2}} buyer, {{3}} link | link in text |
| `parthub_back_in_stock` | Buyer | A part the buyer asked to be told about is back in stock | {{1}} part, {{2}} price, {{3}} link | link in text |
| `parthub_new_order` | Seller | A buyer places an order with the store's parts | {{1}} reference, {{2}} items, {{3}} amount, {{4}} city, {{5}} link | link in text |
| `parthub_order_received` | Buyer | The buyer places an order | {{1}} reference, {{2}} total | Track the order |
| `parthub_order_confirmed` | Buyer | The seller confirms the order (delivery) | {{1}} seller, {{2}} reference | Track the order |
| `parthub_pickup_ready` | Buyer | The seller confirms a pickup order: the part is kept for the buyer | {{1}} reference, {{2}} seller, {{3}} code, {{4}} until, {{5}} address | Track the order |
| `parthub_order_shipped` | Buyer | The seller marks the order shipped (carrier and tracking number if given) | {{1}} reference, {{2}} seller, {{3}} carrier, {{4}} tracking | Track the order |
| `parthub_out_for_delivery` | Buyer | The carrier reports the parcel out for delivery | {{1}} reference, {{2}} amount | Track the order |
| `parthub_delivery_attempt_failed` | Buyer | The carrier reports a failed delivery attempt | {{1}} reference, {{2}} carrier, {{3}} reason | Track the order |
| `parthub_order_delivered` | Buyer | The order is delivered or collected (seller, carrier or pickup code) | {{1}} reference | Track the order |
| `parthub_order_cancelled` | Buyer | The seller (or PartHub) cancels the buyer's order, with a reason | {{1}} reference, {{2}} seller, {{3}} reason | Track the order |
| `parthub_carrier_delivered` | Seller | The carrier reports the parcel delivered (and the cash collected) | {{1}} reference, {{2}} carrier, {{3}} cod | Open the order |
| `parthub_delivery_returned` | Seller | The carrier reports the parcel returned (delivery failed) | {{1}} reference, {{2}} carrier, {{3}} reason | Open the order |
| `parthub_delivery_returning` | Buyer | The carrier (or the seller) reports the parcel going back to the seller | {{1}} reference, {{2}} reason | Track the order |
| `parthub_shipping_delayed` | Buyer | A shipped order has had no carrier update for several days (daily check) | {{1}} reference, {{2}} days | Track the order |
| `parthub_seller_shipping_delayed` | Seller | One of the store's shipped orders has had no carrier update for several days (daily check) | {{1}} reference, {{2}} days, {{3}} carrier | Open the order |
| `parthub_claim_opened` | Seller | A buyer reports a problem with a delivered part (return claim) | {{1}} reference, {{2}} part, {{3}} reason | Open claims |
| `parthub_claim_update` | Buyer | The buyer's claim changes: the seller answers, or PartHub decides | {{1}} reference, {{2}} part, {{3}} status | Track the order |
| `parthub_seller_claim_update` | Seller | A claim on the store changes: the buyer escalates or withdraws, or PartHub decides | {{1}} reference, {{2}} part, {{3}} status | Open claims |
| `parthub_store_approved` | Seller | PartHub approves (or re-activates) the store | {{1}} store | Open my store |
| `parthub_store_blocked` | Seller | PartHub rejects or suspends the store, with a reason | {{1}} store, {{2}} reason | — |
| `parthub_parts_reviewed` | Seller | PartHub reviews the store's parts (one message per review batch) | {{1}} approved, {{2}} rejected | Open inventory |
| `parthub_password_changed` | Account | The account password is changed (all other sessions are signed out) | {{1}} name, {{2}} when | — |

Full texts (ar / fr / en): Admin › WhatsApp › Templates, or the catalog file.
