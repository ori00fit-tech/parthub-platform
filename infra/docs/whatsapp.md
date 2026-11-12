# WhatsApp (Cloud API)

Code: `workers/api/src/utils/whatsapp.ts` (sending, webhook),
`routes/whatsapp.ts` (`/api/v1/whatsapp/webhook`), admin routes in
`routes/admin.ts`, notifications in `utils/request-notifications.ts` and
`utils/stock-alerts.ts`; data: migrations `0004`, `0027`; screen:
Admin › **WhatsApp**. Template texts: `infra/docs/whatsapp-notifications.md`.

## What PartHub does on WhatsApp
- **Notifications** (approved templates, best-effort, never block a
  request): new order → each seller of the order (`parthub_new_order`),
  part request → matching sellers, offer → buyer, offer accepted →
  seller, back in stock → buyer. One message per event and person
  (`whatsapp_notifications`, UNIQUE), never twice.
- **Delivery tracking**: WhatsApp's message id is kept; the webhook
  updates it to delivered / read / failed (with Meta's reason). Admin ›
  WhatsApp shows the last 30 days and the recent failures.
- **Inbox**: messages people send to the PartHub number (text, buttons,
  images, documents, locations) appear in Admin › WhatsApp, linked to the
  seller or buyer with that number. An admin can reply freely within 24
  hours of their last message (WhatsApp's rule); after that, only an
  approved template.
- **Opt-out**: "STOP" (also ARRET, إيقاف…) stops all notifications to that
  number; "START" turns them back on.

## Set-up (Meta › your app › WhatsApp › Production setup)
1. **Secrets of the API Worker** (`cd workers/api`):
   ```bash
   npx wrangler secret put WHATSAPP_ACCESS_TOKEN     # permanent System User token (not the 24-hour test token)
   npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID  # "Phone Number ID" under the number (e.g. 1333067669900608)
   npx wrangler secret put WHATSAPP_VERIFY_TOKEN     # any random text, 16+ characters (you invent it)
   npx wrangler secret put WHATSAPP_APP_SECRET       # App settings › Basic › App secret
   ```
   Admin › WhatsApp shows a green dot for each one that is set.
2. **Configure Webhooks** (the screen in Meta):
   - Callback URL: `https://api.parthub.autos/api/v1/whatsapp/webhook`
   - Verify token: the same text as `WHATSAPP_VERIFY_TOKEN`
   - Verify and save. Then, in the webhook fields, **subscribe to
     `messages`** (it carries both incoming messages and delivery statuses).
   PartHub answers Meta's check only with the right token, and accepts
   events only with Meta's signature (`X-Hub-Signature-256`, app secret).
3. **Register the phone number** (Register button next to it): Meta asks
   for a 6-digit PIN (two-step verification) — keep it safe.
4. **Business verification** (Step 3) and the display name review ("Pending
   review"): needed to message more people and lift the limits.
5. **Templates**: WhatsApp Manager › Message templates, category
   **Utility**, language French (`WHATSAPP_TEMPLATE_LANG = fr`). Names and
   the number / order of `{{n}}` must match exactly. Until a template is
   approved, Meta refuses that message: it shows as failed in Admin ›
   WhatsApp, nothing else breaks.

### `parthub_new_order` (new)
> Nouvelle commande PartHub **{{1}}** : {{2}}.
> À encaisser : **{{3}}** (livraison comprise) — client à {{4}}.
> Confirmez-la ici : {{5}}

`{{1}}` order reference · `{{2}}` items (e.g. "2 × Plaquettes Logan") ·
`{{3}}` amount the seller collects ("520.00 MAD") · `{{4}}` buyer city ·
`{{5}}` seller-portal link to the order

The four other templates (`parthub_new_request`, `parthub_new_offer`,
`parthub_offer_accepted`, `parthub_back_in_stock`) are in
`whatsapp-notifications.md`.

## Checking it works
- Meta's "Verify and save" succeeds → the verify token is right.
- Send a WhatsApp message to the PartHub number → it appears in Admin ›
  WhatsApp › Messages received (if not: app secret, or `messages` not
  subscribed).
- Place an order on a part whose seller has a WhatsApp number → the
  seller receives `parthub_new_order`; its status goes to delivered / read.
