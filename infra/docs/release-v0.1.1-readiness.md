# PartHub v0.1.1 — readiness audit

> Decision (owner, 13 Nov): the release is **v0.1.1**; the old `v0.1.0` tag
> (UK prototype) stays as history. Progress on the backlog is in §7.

Read-only audit of `main` at `ffc44ac` (PR #57), 13 November 2026.
Nothing was merged, deployed, migrated or changed in production to write it.

Status words used below:
- **IMPLEMENTED**: the code exists.
- **TESTED**: an automated test checks it (`workers/api/test/*.test.mjs`, 37 suites, all passing; they run in CI on every PR).
- **WIRED**: it is connected to the rest of the system (UI ↔ API ↔ database ↔ jobs).
- **PROVEN**: seen working in production (health check, deploy logs, a real order or message).
- **ACCEPTED**: the owner agreed it ships in v0.1.0. Not used yet: the owner decides.

## 1. Facts checked first

| Claim | Verdict | Evidence |
|---|---|---|
| Branches: `main`, `ccr-15671f9d-hw1efd`, `ccr-5e78bfde-687nv2` | True | `git branch -r` |
| No open pull requests | True | Both work branches are fully merged: 0 commits ahead of `main`. `ccr-5e78bfde-687nv2` dates from 7 Nov and can be deleted. |
| `package.json` says `1.0.0` | True | Every package says `1.0.0`. |
| **A tag `v0.1.0` already exists** | New finding | It points to `4dcb79d` (29 March 2026, "Initial commit - PartHub UK marketplace"), 271 commits before `main`. Releasing "v0.1.0" needs a decision about this tag (§5). |
| WhatsApp: 5 templates, French only | **Outdated** | `main` has 25 Utility templates in ar/fr/en, sent in each person's language with fallback (`utils/wa-templates.ts`, `infra/docs/whatsapp-templates.md`). 23 were pending at Meta and 2 were corrected after `INCORRECT_CATEGORY`. `WHATSAPP_TEMPLATE_LANG` only remains for the first five templates while Meta's status has not been read. |
| Stack includes KV | **False today** | The README names KV, but `[[kv_namespaces]]` is commented out in `workers/api/wrangler.toml`. The API uses D1 + R2 only. |
| A README feature is not proof | True | Hence the statuses below. |

## 2. Status by area

| Area | Status | Evidence | Gaps |
|---|---|---|---|
| Architecture | IMPLEMENTED, WIRED, PROVEN | pnpm/turbo monorepo: 3 React/Vite sites on Pages, a Hono API on Workers, D1, R2. The API has 17 route files and ~150 endpoints. Shared package for icons, legal, brand, account form, API client and server-message translations. | No API contract file (OpenAPI). Business rules live in `utils/*` (good), but request validation is hand-written per route (no schema library). |
| Auth and roles | TESTED, WIRED, PROVEN | PBKDF2 hashes, `token_version` revocation, role read from the database on every call, rate limits on login, register and password change. Password policy refuses known passwords. Change-password exists in all three apps. | **No forgot-password flow** (no e-mail or SMS sending at all). **No account deletion** (required by the App Store and Google Play). 7-day JWT in `localStorage`, no refresh token (enough for web, not for a mobile app). Whether the shared `admin@parthub.local` password was changed: **unverified, the owner must confirm.** |
| Orders (buyer → seller → delivery) | TESTED, WIRED, PROVEN | Multi-seller orders, stock held at once (no oversell: race test), pickup codes, per-seller lines, cancel and restock atomic, buyer receipt, claims. Prod: 3 orders. | **No duplicate-order protection** (a double tap makes two orders: no idempotency key) and **no rate limit on order creation** (fake cash-on-delivery orders are the classic Moroccan risk). |
| Prices, stock, commissions | TESTED, WIRED | Integer centimes, server-side totals, dated commission rates (0% now), invoices and payments, partial refunds. | — |
| Vehicle catalog and compatibility | TESTED, WIRED, PROVEN | 35 makes, 263 models, 501 generations, 1,306 engines (verify step in production). | — |
| Search | TESTED, WIRED, PROVEN | Make/model/OEM/text search. | `LIKE` on title, sku and description, no full-text index: fine at 70 parts, slow at about 20k. |
| Seller portal | TESTED, WIRED, PROVEN | Inventory, CSV import, photos-per-part screen, orders, carrier updates, claims, store settings, readiness wizard. | 56 parts wait for photos. That is an operational task, not code. |
| Admin | TESTED, WIRED, PROVEN | Moderation (single and bulk), orders, claims, carriers, late shipments, WhatsApp inbox and templates, revenue, invoices, investor KPIs, catalog suggestions. All admin routes sit behind `authMiddleware + adminGuard`. | **No admin audit log**: who approved, suspended or cancelled is not recorded per admin (`order_events` says only "admin"). One admin role, no permission levels. |
| WhatsApp | TESTED, WIRED; partly PROVEN | Webhook with signature check, statuses, inbox with the 24-hour rule, STOP, 25 templates × 3 languages, dedupe, reasons logged. The system-user token now reads and submits templates (seen in the admin). | No template approved yet, so no event message has been proven in production. |
| Shipping and cash on delivery | TESTED, WIRED | 12 carriers, generic webhook, manual carrier updates by seller and admin, late-shipment job, COD collected recorded. | No carrier sends webhooks yet (no contracts). No settlement ledger between carrier, seller and PartHub (documented as manual). |
| Returns | TESTED, WIRED | Claim → seller answer → escalation → PartHub decision → refund, with the 7-day window. | Refunds are recorded, not paid by PartHub (cash-on-delivery model A). |
| Security | TESTED, PROVEN | CORS allow-list, security headers and HSTS on the 4 domains (checked by curl), no secrets in the repo, production guard on scripts. | The Meta app secret and app tokens were shown in a screenshot on 13 Nov: **rotate them** (owner). `CF_GLOBAL_API_KEY` in CI should be a scoped token. `main` has no branch protection. |
| Errors and monitoring | Partial | `/health` with a database check, daily prod-health workflow. | **Worker Logs are switched off** (Cloudflare › parthub-api › Observability): failures cannot be seen. No `app.onError`: an unexpected error returns a plain-text 500, not JSON. |
| Performance | IMPLEMENTED | Indexes on hot paths (verify step), image limit of 5 MB, pagination capped at 100. | No measurement yet (no load test, no p95). Images are served at full size (no resizing). |
| SEO | TESTED, PROVEN | Titles, meta, canonical, Open Graph, robots, dynamic sitemap, JSON-LD (Product, Offer, Breadcrumb) in the server HTML, soft-404 handled. | — |
| Testing | TESTED | 37 API suites in CI, including races, lifecycle, security, carriers and WhatsApp. Playwright is used by hand for screenshots. | **No E2E suite in CI** (browser flows: sign up → order → seller ships → delivered). No front-end unit tests. |
| Deployment | WIRED, PROVEN | CI (typecheck, lint, tests, 3 builds) → Deploy API runs the D1 migrations first, then a schema verify gate, then Pages. | Backup, restore and rollback: `infra/docs/operations-runbook.md` and a weekly export (`d1-backup.yml`), added for v0.1.1. Versions are not tagged per release. |
| Documentation | IMPLEMENTED | `infra/docs/*` (carriers, WhatsApp, revenue, shipping, assets inventory…). | The README is out of date (KV, and earlier wording). No CHANGELOG. |
| Legal and company | IMPLEMENTED | Terms, privacy, seller agreement, returns policy, versioned acceptance. The company block (`legal/company.js`) stays empty until PartHub SARL is registered. | Fill once registered; CNDP filing. |

## 3. Backlog for v0.1.1 (by severity)

**P0 — before calling anything a release (owner actions, no code)**
1. Confirm the `admin@parthub.local` password was changed, or deactivate that account after creating a real admin.
2. Rotate the Meta app secret (PartHub and Rahba apps), then update `WHATSAPP_APP_SECRET` in Cloudflare.
3. Turn on Worker Logs (Observability).

**P1 — code, in this order**
1. Duplicate-order protection: an idempotency key from the checkout plus a short-window duplicate check, and a rate limit on orders per buyer and per phone.
2. Forgot password. Option A: e-mail (needs a sender, e.g. Cloudflare Email or Resend). Option B: WhatsApp one-time code (an Authentication template). B fits Moroccan buyers better and reuses what exists.
3. A JSON error handler (`app.onError`) with a request id, so the logs and the apps get a clean error.
4. An admin audit log (admin id, action, target, before and after) for moderation, order and claim decisions, and settings.
5. Backup / restore / rollback runbook (D1 Time Travel, a weekly export to R2, Worker and Pages rollback).
6. Release hygiene: decide the old `v0.1.0` tag, set versions to `0.1.0`, CHANGELOG, README fixed, `main` protected.

**P2 — before the mobile apps**
1. Account deletion (in-app and a public web page).
2. Refresh tokens and per-device sessions (short access token plus refresh), with the web keeping its current behaviour.
3. An OpenAPI contract for the endpoints the apps use (buyer and seller), checked in CI.
4. E2E browser tests in CI (buyer order, seller ships, delivered, claim).
5. Image resizing / thumbnails for mobile data.

**P3 — later**
Full-text search, load test and p95 targets, admin roles, carrier API integrations, a settlement ledger, the lint warning in `utils/part-import.ts`.

## 4. Acceptance criteria for v0.1.1
- P0 done and P1 done, or explicitly accepted by the owner as known limits.
- CI green; the full order lifecycle proven once in production (a real or staff order: placed → confirmed → shipped → delivered), with its WhatsApp messages once templates are approved.
- Migrations, deploy, backup / restore and rollback written down.
- The release commit tagged and recorded in the CHANGELOG.

## 5. Decision needed: the existing `v0.1.0` tag
The tag `v0.1.0` marks the first UK prototype commit (29 March). Options:
- **A (recommended)**: rename it to `v0.0.0-uk-prototype` (delete `v0.1.0`, push the new name) and use `v0.1.0` for this release. Needs the owner's explicit approval: it changes a published tag.
- **B**: keep it and release as `v0.2.0`.

## 6. Mobile apps (after v0.1.1)
One API for web and apps (already so). React Native + Expo for buyer and seller, admin stays on the web. Prerequisites are P2 items 1–3 above, plus push notifications (Expo push) as a cheaper channel than WhatsApp templates for logged-in app users.

## 7. Progress on the backlog (branch `ccr-15671f9d-hw1efd`)
| Item | State |
|---|---|
| P1.1 duplicate / fake orders | Done: idempotency key, same-cart window, open-orders cap, limits per account and phone (migration 0030, `order-guard.test.mjs`) |
| P1.2 forgot password | Waiting for the owner's choice (e-mail or WhatsApp code) |
| P1.3 JSON error handler | Done: request id, no internals, 400 on bad JSON (`errors.test.mjs`) |
| P1.4 admin audit log | Done: every admin change, Activity log page (migration 0031, `audit.test.mjs`) |
| P1.5 backup / restore / rollback | Done: `d1-backup.yml` weekly, `operations-runbook.md` |
| P1.6 release hygiene | Versions 0.1.1, `/health` shows it, CHANGELOG, README corrected. Left to the owner: protect `main`, delete the merged branch `ccr-5e78bfde-687nv2`, tag `v0.1.1` after the release checks |
| P0 (owner) | Admin password, Meta app secret rotation, Worker Logs: to confirm |
