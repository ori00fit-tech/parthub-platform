# PartHub Platform

PartHub Platform is a Cloudflare-powered automotive parts marketplace monorepo. It brings together a buyer-facing storefront, a seller portal, an admin dashboard, and a Hono API worker into a single pnpm workspace-based project.

## Overview

This repository is designed as a production-style marketplace platform for automotive parts, with a clear separation between customer-facing storefront experiences, seller workflows, and operational platform management.

The system is organized around:

- Storefront: buyer shopping experience and product discovery
- Seller Portal: seller operations, listings, requests, and order management
- Admin: platform operations, seller oversight, analytics, and management tools
- API Worker: Hono-based backend for marketplace logic and platform services
- Shared Packages: reusable frontend and business logic
- Infrastructure: Cloudflare D1, R2, KV, and deployment configuration

## Architecture

| Layer | Technology |
| --- | --- |
| Frontend apps | React 18 + Vite + Tailwind CSS |
| API | Hono on Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| File storage | Cloudflare R2 |
| Cache / KV | Cloudflare KV |
| Monorepo tooling | pnpm workspaces + Turborepo |
| CI | GitHub Actions |

## Project Structure

```text
parthub-platform/
├── apps/
│   ├── storefront/          # Buyer-facing marketplace
│   ├── seller-portal/       # Seller dashboard and operations
│   └── admin/               # Platform administration
├── workers/
│   └── api/                 # Hono API worker
├── packages/
│   ├── shared/              # Shared app code, icons, legal content
│   ├── utils/               # shared utility helpers
│   └── config/              # frontend config package
├── infra/
│   ├── d1/                  # database schema, migrations, seeds
│   ├── r2/                  # R2 bucket docs and configuration
│   ├── cloudflare/          # Cloudflare bindings docs
│   └── docs/                # infrastructure notes
├── scripts/                 # bootstrap, seed, diagnostics, maintenance
├── .github/
│   └── workflows/           # CI/CD automation
├── .env.example             # example environment configuration
├── package.json             # root monorepo scripts
├── pnpm-workspace.yaml      # workspace configuration
├── turbo.json               # Turbo metadata for builds
├── tsconfig.base.json       # shared TypeScript config
├── README.md                # project documentation
├── .gitignore
├── .env.example
├── pnpm-lock.yaml
├── storefront-audit-report.txt
├── tmp-fix-image.json
└── deploy-api.sh
```

## Applications

### Storefront

The storefront is the public buyer experience for the marketplace.

Included features and flows:

- Home page and product discovery
- Parts catalog and part detail pages
- Vehicle selector and compatibility flow
- Cart and checkout
- Order placement, order tracking, and account pages
- Request-a-part workflows
- Seller profile browsing
- Legal pages and support content

Primary routes include:

- `/`
- `/parts`
- `/parts/:slug`
- `/vehicle-selector`
- `/cart`
- `/auth`
- `/checkout`
- `/checkout/success`
- `/compare`
- `/sellers/:slug`
- `/request-part`
- `/requests`
- `/account`
- `/orders`

### Seller Portal

The seller portal supports vendor management and operational workflows.

Included features:

- Seller authentication
- Dashboard overview
- Inventory and part management
- Part creation and editing workflows
- Order management
- Review monitoring
- Requests inbox
- Store settings
- Insights and analytics
- Agreement and legal pages

Primary routes include:

- `/`
- `/auth`
- `/parts`
- `/parts/new`
- `/parts/:id/edit`
- `/orders`
- `/orders/:id`
- `/requests`
- `/reviews`
- `/insights`
- `/store-settings`
- `/agreement`
- `/issues`
- `/legal`

### Admin

The admin application provides operational management for the marketplace.

Included features:

- Dashboard
- Seller management
- Seller detail inspection
- Parts management
- Categories management
- Vehicle management
- Orders overview
- Issues tracking
- Reviews
- Analytics

Primary routes include:

- `/`
- `/auth`
- `/sellers`
- `/sellers/:id`
- `/parts`
- `/parts/:id`
- `/categories`
- `/vehicles`
- `/orders`
- `/reviews`
- `/issues`
- `/analytics`

## Backend API

The API is implemented as a Hono application running on Cloudflare Workers.

The entrypoint is mounted in:

- `workers/api/src/app.ts`

The service exposes route groups under `/api/v1`, including:

- `/api/v1/health`
- `/api/v1/auth`
- `/api/v1/vehicles`
- `/api/v1/catalog`
- `/api/v1/search`
- `/api/v1/storefront/sellers`
- `/api/v1/catalog/parts`
- `/api/v1/marketplace`
- `/api/v1/media`
- `/api/v1/commerce`
- `/api/v1/admin`
- `/api/v1/admin/analytics`
- `/api/v1/whatsapp`
- `/api/v1/requests`
- `/api/v1/stock-alerts`

This backend supports catalog browsing, seller workflows, admin operations, order and requests logic, media access, WhatsApp interactions, and analytics.

## Shared Packages

### `packages/shared`

The shared package exposes shared frontend-facing and business logic resources, including:

- icons
- legal content
- shared types and exported modules

### `packages/utils`

The utilities package contains common helper logic used across applications.

### `packages/config`

The config package centralizes shared frontend configuration for Vite/Tailwind-related settings.

## Infrastructure

### Cloudflare D1

The project is built around Cloudflare D1 for relational data storage. Database and seeding assets live under:

- `infra/d1/`
- `scripts/seed-d1.sh`
- `scripts/d1-remote-*.sh`

### Cloudflare R2

The platform expects Cloudflare R2 for media assets and object storage.

### Cloudflare KV

KV is configured as part of the platform environment and is referenced in the environment example file.

## Local Development

### Prerequisites

- Node.js 18+
- pnpm 8+
- Cloudflare Wrangler for Worker/D1/R2 access

### 1. Clone and install

```bash
git clone https://github.com/ori00fit-tech/parthub-platform.git
cd parthub-platform
cp .env.example .env
pnpm install
```

### 2. Bootstrap

```bash
bash scripts/bootstrap.sh
```

This script ensures pnpm is installed if needed, creates `.env` from `.env.example`, and installs dependencies.

### 3. Run the monorepo

```bash
pnpm dev
```

### 4. Run apps individually

```bash
pnpm --filter @parthub/storefront dev   # http://localhost:3000
pnpm --filter @parthub/seller-portal dev  # http://localhost:3001
pnpm --filter @parthub/admin dev         # http://localhost:3002
pnpm --filter @parthub/api dev          # http://localhost:8787
```

## Environment Variables

The repo includes `.env.example` with the required configuration.

```env
APP_ENV=development

JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

CF_ACCOUNT_ID=your-cloudflare-account-id
CF_D1_DATABASE_ID=your-d1-database-id
CF_R2_BUCKET=parthub-media
CF_KV_NAMESPACE_ID=your-kv-namespace-id

WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_VERIFY_TOKEN=your-webhook-verify-token

VITE_API_BASE_URL=http://localhost:8787
VITE_APP_NAME=PartHub
VITE_APP_ENV=development

VITE_SELLER_API_BASE_URL=http://localhost:8787
VITE_SELLER_APP_NAME=PartHub Seller

VITE_ADMIN_API_BASE_URL=http://localhost:8787
VITE_ADMIN_APP_NAME=PartHub Admin
```

## Scripts

The `scripts/` directory contains setup, database, diagnostics, and maintenance helper scripts.

| Script | Purpose |
| --- | --- |
| `bootstrap.sh` | installs dependencies and prepares local env |
| `seed-d1.sh` | seeds the D1 database |
| `check-api.sh` | check API health |
| `check-storefront.sh` | quick storefront validation |
| `repo-diagnostics.sh` | checks repo environment and tooling |
| `clean-node-modules.sh` | removes installed dependencies |
| `audit-storefront.sh` | storefront audit helper |
| `d1-remote-*.sh` | remote database schema / seed / reset flows |
| `format-all.sh` | format repository files |
| `lint-all.sh` | run linting across repo |
| `export-env-example.sh` | build `.env.example` output |

## CI/CD

The repository includes GitHub Actions workflows for continuous integration and deployment.

Key workflows:

- `.github/workflows/ci.yml` — lint and build validation
- `.github/workflows/deploy-api.yml` — API deployment
- `.github/workflows/deploy-pages.yml` — frontend deployment
- `.github/workflows/d1-migrate.yml` — database migration automation
- `.github/workflows/deploy-notes.yml` — deployment note automation

The CI workflow runs builds for:

- storefront
- seller portal
- admin
- API typecheck

## Build and Quality Commands

Run from the repository root:

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm format
```

## Deployment

### API Worker

```bash
cd workers/api
wrangler deploy
```

### Frontend apps

The project is designed to deploy frontends via Cloudflare Pages or a matching static hosting setup.

## Notes

- The project uses a single API layer for multiple client apps.
- Database values and platform-specific configs should remain in environment files and secrets.
- The repo is structured for real production operations rather than a simple demo app.

## License

This project uses the repository’s configured license terms. Confirm the exact license text in the repo before external distribution or reuse.
