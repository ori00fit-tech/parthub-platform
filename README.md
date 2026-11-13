# PartHub

**A marketplace for car parts in Morocco**: buyers find the right part for
their vehicle and pay cash on delivery; local sellers (shops, breakers,
importers) list their stock and manage orders; PartHub moderates and runs
the platform. Arabic, French and English (RTL included).

**Version 0.1.1 — release candidate.** Changes: [`CHANGELOG.md`](CHANGELOG.md).
Release status, known limits and backlog:
[`infra/docs/release-v0.1.1-readiness.md`](infra/docs/release-v0.1.1-readiness.md).

| Site | Address | Who |
|---|---|---|
| Storefront | https://parthub.autos | Buyers |
| Seller portal | https://seller.parthub.autos | Sellers |
| Admin | https://admin.parthub.autos | PartHub team |
| API | https://api.parthub.autos/api/v1/health | All of the above |

## Project status

| Area | State |
|---|---|
| Buying (search by vehicle / name / part number, cart, checkout, tracking, claims) | Live |
| Selling (store, inventory, CSV import, photos, orders, carrier updates, claims) | Live |
| Admin (moderation, orders, claims, carriers, WhatsApp, revenue, activity log) | Live |
| Payment | Cash on delivery only (no online payment) |
| Commission | Ledger and invoices ready; rate is 0% while selling is free |
| Shipping | 12 Moroccan carriers; status by webhook or entered by hand; no carrier API contract signed yet |
| WhatsApp | Webhook, inbox, 26 templates × 3 languages (approval at Meta pending), automatic retries |
| Forgot password | Code on WhatsApp, or a one-time link from PartHub |
| Account deletion | 30 days to change one's mind, then personal data erased (orders kept); public page `/delete-account` |
| Mobile apps | Planned after 0.1.1 (React Native + Expo, same API) |

## Architecture

```text
 Browser ──► Cloudflare Pages ──────────────┐
   parthub.autos          (storefront + Pages Functions: SEO, sitemap, soft-404)
   seller.parthub.autos   (seller portal)    │  fetch /api/v1/…
   admin.parthub.autos    (admin)            ▼
                                   Cloudflare Worker "parthub-api" (Hono)
                                     │            │             │
                                  D1 (SQLite)   R2 (photos,   Meta WhatsApp Cloud API
                                  parthub-db    backups)      carriers' webhooks
                                     ▲
                       daily cron 03:17 UTC (commissions, late shipments)
```

| Layer | Technology |
|---|---|
| Front-end | React 18, Vite, Tailwind CSS, React Router |
| API | Hono 4 on Cloudflare Workers (TypeScript) |
| Database | Cloudflare D1 (SQLite) |
| Files | Cloudflare R2 (part / store photos, database backups) |
| Hosting | Cloudflare Pages (3 projects) + Workers |
| Messaging | WhatsApp Cloud API (Meta) |
| Monorepo | pnpm workspaces + Turborepo |
| CI/CD | GitHub Actions |

KV is not used (the block in `wrangler.toml` is commented out).

## Repository layout

```text
apps/
  storefront/       buyer site; functions/ = Pages Functions (SEO tags, sitemap.xml, soft-404)
  seller-portal/    seller site
  admin/            admin site (always dark)
workers/api/
  src/app.ts        Hono app: CORS, security headers, routes, error handler
  src/index.ts      Worker entry: fetch + scheduled (daily cron)
  src/routes/       one file per area (auth, commerce, marketplace, admin, carriers, whatsapp…)
  src/utils/        business rules (orders, fulfillment, commissions, invoices, carriers,
                    WhatsApp templates and events, order guard, audit log…)
  test/             API test suites (run.mjs bundles the Worker, runs it on in-memory SQLite)
packages/
  shared/           API client, translations of server messages, icons, brand,
                    legal texts and company details, account forms, shipment labels
  utils/, config/   small helpers, shared Vite / Tailwind / Prettier config
e2e/                browser scenarios across the three sites (Playwright)
infra/
  d1/schema.sql     the full current schema (what a new database is created from)
  d1/migrations/    numbered, additive migrations applied to production
  d1/catalog/       Moroccan vehicle catalog source → migration 0017
  docs/             guides (see "Documentation" below)
scripts/            local / remote database helpers, checks (production ones ask for confirmation)
.github/workflows/  CI, deploys, migrations, backup, daily health check
```

## The API in short

All routes are under `/api/v1`. Responses are JSON:
`{ "success": true, "ok": true, "data": …, "meta"?: …, "pagination"?: … }` or
`{ "success": false, "ok": false, "error": "English message" | { code, message }, "request_id"? }`.
The sites translate the English messages (`packages/shared/src/i18n/server-messages.ts`).

| Group | What |
|---|---|
| `/health` | Status, version, database check |
| `/auth` | Register, login, me, logout, change password, forgot / reset password, delete account |
| `/vehicles`, `/catalog`, `/search` | Vehicle catalog, categories, parts, search |
| `/commerce` | Checkout, buyer orders, receipt, claims, reviews, fulfilment options |
| `/marketplace` | Seller: store, parts, photos, import, orders, carrier updates, claims, statements |
| `/requests` | "Request a part" and seller offers |
| `/stock-alerts` | Back-in-stock alerts |
| `/carriers` | Carrier list, carriers' status webhooks |
| `/media` | Photo upload (R2) and serving |
| `/whatsapp` | Meta webhook |
| `/admin`, `/admin/analytics` | Everything the admin does (admins only; every change is logged) |

Conventions:
- **Auth**: `Authorization: Bearer <JWT>` (7 days). The role and store are read
  from the database on each call; signing out or changing the password
  revokes every session (`users.token_version`).
- **Language**: the sites send `X-PartHub-Lang: ar|fr|en`; it is stored on the
  account and used for WhatsApp messages.
- **Checkout**: send an `Idempotency-Key` (one per checkout): a retry returns
  the same order (`utils/order-guard.ts`).
- **Money** is in centimes (integers), shown as MAD.
- **Errors**: unexpected ones return 500 with a `request_id`, also in the
  `X-Request-Id` header and the Worker logs.

**The contract for the apps**: `GET /api/v1/openapi.json` (OpenAPI 3.1,
from `workers/api/src/openapi.ts`): every route the sites and the mobile
apps use, not the admin nor the webhooks. `test/openapi.test.mjs` fails when
a route is added without documenting it, when a documented route no longer
exists, or when a real answer no longer matches its schema. Every answer
carries both `success` and `ok` (same value).

## Local development

Requirements: Node.js 20 or later (CI uses 22), pnpm 9 (`corepack enable`).
Wrangler comes with the API package. No Cloudflare account is needed to
work locally.

```bash
git clone https://github.com/ori00fit-tech/parthub-platform.git
cd parthub-platform
pnpm install
```

**API with a local database** (nothing touches production):

```bash
# 1. A local D1 database: schema, indexes, sample categories, the Moroccan
#    vehicle catalog (local by default; --remote is guarded)
bash scripts/seed-d1.sh

# 2. Local settings and secrets (git-ignored)
cd workers/api
printf 'APP_ENV=development\nJWT_SECRET=%s\n' "$(openssl rand -hex 32)" > .dev.vars

# 3. Run it
pnpm dev                                      # http://localhost:8787/api/v1/health
```

No admin is seeded: register on the storefront, then make yourself admin
locally:
`npx wrangler d1 execute parthub-db --local --command "UPDATE users SET role='admin' WHERE email='you@example.com'"`.
WhatsApp stays off without its secrets: everything else works.

**Sites** (each in its own terminal). Point them at the local API with
`apps/<app>/.env.local` (lines in `.env.example`), or leave it out to use
the production API:

```bash
pnpm --filter @parthub/storefront dev      # http://localhost:3000
pnpm --filter @parthub/seller-portal dev   # http://localhost:3001
pnpm --filter @parthub/admin dev           # http://localhost:3002
```

## Tests and checks

```bash
pnpm --filter @parthub/api typecheck   # TypeScript
pnpm lint                              # ESLint, all packages
pnpm --filter @parthub/api test        # API suites
node workers/api/test/run.mjs orders   # only the suites whose name contains "orders"
pnpm build                             # the three sites
```

The API tests bundle the Worker with esbuild and run it against an
in-memory SQLite built from `infra/d1/schema.sql` (no Cloudflare account
needed). They cover the order lifecycle, stock races, the duplicate-order
guard, pickup, shipping and carriers, claims, commissions and invoices,
WhatsApp (webhook, templates, languages), security headers and CORS,
sessions and passwords, the audit log, SEO routes and more. CI runs all
of the above on every pull request.

**End-to-end** (`e2e/`, workflow `E2E`): the real API (`wrangler dev`, local
D1 seeded fresh by `e2e/scripts/start-api.mjs`) and the three sites built
against it, driven by Chromium: a new buyer orders → the seller confirms,
ships, records the carrier's update, delivers → the buyer sees it
delivered → PartHub approves a part and the activity log shows it; plus
sign-in errors, forgot password, the deletion page, Arabic RTL, and a buyer
kept out of the seller portal. About 30 seconds.

```bash
pnpm --filter @parthub/e2e exec playwright install chromium   # once
pnpm --filter @parthub/e2e test                                # starts everything itself
```

## Configuration

**Worker variables** (plain, in `workers/api/wrangler.toml` › `[vars]`):
`APP_ENV`, `JWT_EXPIRES_IN`, `STOREFRONT_URL`, `SELLER_PORTAL_URL`,
`ADMIN_URL`, `SHIPPING_FEE_CENTIMES`, `WHATSAPP_TEMPLATE_LANG`; optional
`ORDER_MAX_OPEN`. Change them in the file, not in the dashboard (a deploy
replaces dashboard variables).

**Worker secrets** (`npx wrangler secret put NAME` or Cloudflare ›
parthub-api › Settings › *Secret*):

| Secret | For |
|---|---|
| `JWT_SECRET` | Signing sessions (changing it signs everyone out) |
| `WHATSAPP_ACCESS_TOKEN` | Meta: a **System User** token that never expires |
| `WHATSAPP_PHONE_NUMBER_ID` | The PartHub number (not Meta's test number) |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Reading and submitting templates |
| `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | Webhook check and signature |
| `CARRIER_<CODE>_WEBHOOK_SECRET` | One per carrier that sends webhooks |

**GitHub Actions secrets**: `CF_EMAIL`, `CF_GLOBAL_API_KEY` (to be replaced by
a scoped API token), `VITE_API_BASE_URL`.

No secret is ever committed. Their owners and rotation:
[`infra/docs/assets-inventory.md`](infra/docs/assets-inventory.md).

## Database changes

`infra/d1/schema.sql` is the full schema; production evolves only through
`infra/d1/migrations/NNNN_name.sql`. For a change:
1. Write the migration: **additive only** (new tables, new columns,
   `IF NOT EXISTS`), so an older API still works and a rollback stays safe.
   `ALTER TABLE … ADD COLUMN` lines are applied one by one (already applied = skipped).
2. Put the same change in `schema.sql` (the tests use it).
3. Add a step to `.github/workflows/d1-migrate.yml` and a check to
   `.github/scripts/d1-verify.sh` (the deploy stops if it is missing).

## Deployment and operations

Merging to `main` deploys:
**CI** → **Deploy API** (D1 migrations, schema verify gate, Worker) →
**Deploy Pages** (the three sites). Other workflows: daily production
health check, weekly database backup to private R2.

Backup, restore (D1 Time Travel or an export), rollback (Worker and Pages)
and incidents: [`infra/docs/operations-runbook.md`](infra/docs/operations-runbook.md).

## Documentation

| Guide | About |
|---|---|
| `infra/docs/release-v0.1.1-readiness.md` | What is done, tested, proven; backlog |
| `infra/docs/operations-runbook.md` | Backup, restore, rollback, incidents |
| `infra/docs/architecture-overview.md` | Architecture notes |
| `infra/docs/whatsapp.md`, `whatsapp-templates.md` | WhatsApp set-up, the 25 templates |
| `infra/docs/carriers.md`, `shipping.md`, `fulfillment-methods.md` | Carriers, delivery, pickup |
| `infra/docs/revenue.md` | Commissions, invoices, payments |
| `infra/docs/part-import.md`, `part-numbers.md`, `vehicle-catalog.md` | Catalog and imports |
| `infra/docs/seller-workflow.md`, `landing-pages.md`, `brand.md`, `icons.md` | Product and brand |
| `infra/docs/custom-domain.md`, `infra/cloudflare/bindings.md`, `infra/r2/bucket-structure.md` | Cloudflare set-up |
| `infra/docs/assets-inventory.md` | Everything PartHub owns (code, domains, accounts, data) |

## Working on the code

- Branch from `main`, open a pull request; CI must be green. `main` deploys.
- User-facing text is written in English in the code and translated in
  each app's `src/i18n/ar.js` and `fr.js` (server messages in
  `packages/shared`). A new string needs its two translations.
- Business rules go in `workers/api/src/utils/`, with a test in `workers/api/test/`.
- Scripts that write to production refuse to run without `CONFIRM_PRODUCTION=parthub-db`.
- Personal data (law 09-08): never copy production data to a laptop or a
  third-party tool without need; delete exports after use.

## License

No license file: all rights reserved by the owner of PartHub. Third-party
code is under permissive licences (MIT, ISC, OFL fonts); see
`infra/docs/assets-inventory.md`.
