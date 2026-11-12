# WhatsApp notifications — templates

> **Now:** all templates (orders, shipping, claims, store, account) in
> Arabic, French and English are in `whatsapp-templates.md`. This page
> keeps the history of the first four.

Set-up, webhook, delivery tracking and inbox: see `whatsapp.md`. New
orders also notify the seller (`parthub_new_order`, text in `whatsapp.md`).

The API sends WhatsApp template messages at four moments:

| When | To | Template |
|---|---|---|
| A buyer posts a part request | Matching active sellers (stock the same make or category) | `parthub_new_request` |
| A seller sends the first offer on a request | The buyer | `parthub_new_offer` |
| The buyer accepts an offer | That seller | `parthub_offer_accepted` |
| A seller restocks a part a buyer asked to be told about | That buyer (if their account has a phone) | `parthub_back_in_stock` |

Sending is **best-effort and off the request path** (`waitUntil`): if WhatsApp
is not configured, a number is invalid, or Meta rejects a message, the API
request still succeeds and the failure is logged.

## Setup

1. **Secrets** (already used by the order notification):

   ```bash
   wrangler secret put WHATSAPP_ACCESS_TOKEN
   wrangler secret put WHATSAPP_PHONE_NUMBER_ID
   ```

   Without both, no notification is attempted.

2. **Migration** — creates the `whatsapp_notifications` log:

   ```bash
   wrangler d1 execute parthub-db --remote --file=infra/d1/migrations/0004_whatsapp_notifications.sql
   ```

3. **Vars** in `wrangler.toml` (defaults shown):

   | Var | Default | Used for |
   |---|---|---|
   | `WHATSAPP_TEMPLATE_LANG` | `fr` | Language code the templates are registered in |
   | `STOREFRONT_URL` | `https://parthub.autos` | Link sent to buyers |
   | `SELLER_PORTAL_URL` | `https://seller.parthub.autos` | Link sent to sellers |

4. **Create and get the four templates approved** in Meta Business Manager →
   WhatsApp Manager → Message templates. Category: **Utility**. The names and
   the number/order of `{{n}}` variables must match exactly. Suggested text
   (French, matching the default `fr`):

### `parthub_new_request`

> Nouvelle demande de pièce sur PartHub : **{{1}}** pour **{{2}}** à {{3}}.
> Envoyez votre offre ici : {{4}}

`{{1}}` part · `{{2}}` vehicle (e.g. "Renault Clio 2015") · `{{3}}` buyer city · `{{4}}` seller-portal link

### `parthub_new_offer`

> Bonne nouvelle ! **{{2}}** vous propose **{{1}}** à **{{3}}**.
> Comparez les offres et choisissez la meilleure : {{4}}

`{{1}}` part · `{{2}}` seller name · `{{3}}` price (e.g. "650.00 MAD") · `{{4}}` storefront link

### `parthub_offer_accepted`

> {{2}} a accepté votre offre pour **{{1}}** 🎉
> Ses coordonnées sont disponibles ici : {{3}}

`{{1}}` part · `{{2}}` buyer name · `{{3}}` seller-portal link

### `parthub_back_in_stock`

> Bonne nouvelle ! **{{1}}** est de nouveau disponible à **{{2}}** sur PartHub.
> Commandez-la ici : {{3}}

`{{1}}` part · `{{2}}` price (e.g. "1000.00 MAD") · `{{3}}` storefront link to the part

Back-in-stock alerts need migration `0012_stock_alerts.sql`. Without WhatsApp,
buyers still see restocked parts under **Stock alerts** in their account.

To use Arabic instead, register the templates in Arabic (`ar`) and set
`WHATSAPP_TEMPLATE_LANG = "ar"`.

## Limits and de-duplication

- Each message is recorded in `whatsapp_notifications` with a unique
  `(kind, ref_id, recipient)`, so a message is never sent twice: updating an
  offer, or withdrawing and re-offering, doesn't re-notify the buyer.
- At most **25 sellers** are alerted per request, and each seller gets at most
  **10 new-request alerts per 24 hours**.
- Only `active` sellers with a `whatsapp` or `phone` number are alerted.
  Local Moroccan numbers (`06…`) are converted to `2126…`.
- `sent = 0` rows are attempts Meta rejected; check the Worker logs for the
  `[whatsapp]` warning with Meta's error.

Note: WhatsApp only delivers template messages to users who have agreed to be
contacted. The request form tells buyers their number is used for offers;
sellers should be told the same when they register their store.
