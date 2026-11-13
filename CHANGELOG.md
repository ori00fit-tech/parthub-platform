# Changelog

Versions follow [Semantic Versioning](https://semver.org/). Before 1.0.0,
a minor version may change the API. The tag `v0.1.0` marks the first UK
prototype commit (29 March 2026) and is kept as history; the first
release of the Moroccan marketplace is **0.1.1**.

## [0.1.1] — unreleased (release candidate)

First release of PartHub Morocco: buyers, sellers and PartHub operations,
cash on delivery, on Cloudflare (Workers, D1, R2, Pages). Readiness and
known limits: `infra/docs/release-v0.1.1-readiness.md`.

### Marketplace
- Storefront in Arabic, French and English (RTL): search by vehicle, name
  or part number; vehicle catalog for Morocco (35 makes, 501 generations,
  1,306 engines); compatibility; part pages with photos; cart; checkout
  with delivery, store pickup or courier; order tracking; part requests
  and seller offers; back-in-stock alerts; returns and claims.
- Seller portal: store set-up wizard, inventory, CSV import, photos per
  part, orders (confirm, ship with carrier and tracking, carrier updates,
  delivered, cancel), pickup codes, claims, requests, statements.
- Admin: moderation (single and bulk), orders, claims, carriers and late
  shipments, WhatsApp inbox and templates, revenue and commission
  invoices, investor metrics, catalog suggestions, activity log.

### Orders, money, shipping
- Stock held at order time (no oversell under concurrency), per-seller
  lines and delivery fees, atomic cancel and restock.
- **Duplicate and fake order guard**: idempotency key per checkout, same
  cart within 10 minutes, at most 5 orders awaiting confirmation, limits
  per account (8/hour) and per phone (12/day).
- Commission ledger with dated rates (0% while selling is free), invoices,
  payments, partial refunds.
- 12 Moroccan carriers, generic webhook, manual carrier updates, late
  shipment detection (4 days) with daily notices.

### WhatsApp
- Webhook with signature check, delivery statuses, inbox (24-hour rule),
  STOP opt-out.
- 25 Utility templates in ar/fr/en, sent in each person's language with
  fallback; submitted to and synced from Meta from the admin.

### Security and operations
- PBKDF2 passwords, session revocation, rate limits on sign-in, sign-up,
  password change and orders; password policy refusing known passwords;
  change-password in all apps, weak-password warning for admins.
- CORS allow-list, security headers and HSTS, production guard on scripts.
- JSON error handler with request id; admin audit log of every change.
- CI: typecheck, lint, 40+ API test suites, builds. Deploy runs migrations
  first, then a schema verify gate.
- Weekly D1 backup to private R2; runbook for restore, rollback and
  incidents (`infra/docs/operations-runbook.md`).
- `/api/v1/health` reports the version and the database state.
