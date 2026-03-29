# PartHub Platform

A production-ready auto parts marketplace built on the Cloudflare stack.

## Apps

| App | Port | Domain |
|-----|------|--------|
| `storefront` | 3000 | parthub.site |
| `seller-portal` | 3001 | seller.parthub.site |
| `admin` | 3002 | admin.parthub.site |
| `api` (Worker) | 8787 | api.parthub.site |

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Hono on Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2 |
| Cache/KV | Cloudflare KV |
| Monorepo | pnpm workspaces + Turborepo |
| CI | GitHub Actions |

## Project Structure

```
parthub-platform/
├── apps/
│   ├── storefront/       # Buyer-facing marketplace
│   ├── seller-portal/    # Seller dashboard
│   └── admin/            # Admin panel
├── workers/
│   └── api/              # Hono backend (all routes)
├── packages/
│   ├── shared/           # Types, API client, formatters
│   ├── utils/            # Pure utility functions
│   └── config/           # Shared vite/tailwind/prettier config
├── infra/
│   ├── d1/               # SQL schema, indexes, seeds, migrations
│   ├── r2/               # R2 bucket structure docs
│   └── cloudflare/       # Bindings & deploy docs
└── scripts/              # Bootstrap, seed, diagnostics
```

## Quick Start

### 1. Clone & bootstrap

```bash
git clone https://github.com/YOUR_USERNAME/parthub-platform.git
cd parthub-platform
bash scripts/bootstrap.sh
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Set up Cloudflare D1

```bash
wrangler d1 create parthub-db
# Copy the database_id into wrangler.toml
bash scripts/seed-d1.sh --local
```

### 4. Set up R2

```bash
wrangler r2 bucket create parthub-media
```

### 5. Set Worker secrets

```bash
cd workers/api
wrangler secret put JWT_SECRET
wrangler secret put WHATSAPP_ACCESS_TOKEN
wrangler secret put WHATSAPP_PHONE_NUMBER_ID
```

### 6. Run locally

```bash
# All apps in parallel
pnpm dev

# Or individually
pnpm --filter @parthub/api dev          # API on :8787
pnpm --filter @parthub/storefront dev  # Storefront on :3000
pnpm --filter @parthub/seller-portal dev
pnpm --filter @parthub/admin dev
```

## Deployment (Cloudflare)

### API Worker

```bash
cd workers/api
wrangler deploy
```

### Frontend (Cloudflare Pages)

```bash
# Storefront
cd apps/storefront && pnpm build
wrangler pages deploy dist --project-name=parthub-storefront

# Seller portal
cd apps/seller-portal && pnpm build
wrangler pages deploy dist --project-name=parthub-seller

# Admin
cd apps/admin && pnpm build
wrangler pages deploy dist --project-name=parthub-admin
```

## Termux / Android Notes

- Use `--local` flag with wrangler d1 commands during development
- Run `bash scripts/repo-diagnostics.sh` to check your environment
- Node 18+ required: `pkg install nodejs`
- pnpm: `npm install -g pnpm`

## Architecture Decisions

- **Layering**: route → service → repository → validator → utils (workers/api)
- **Auth**: Separate JWT tokens per app (`ph_buyer_*`, `ph_seller_*`, `ph_admin_*`)
- **Prices**: Stored as integer cents in DB, formatted at display time
- **snake_case**: Used throughout DB, API responses, and frontend
- **Vehicle compatibility**: Dedicated `part_compatibility` table with make/model/year range

## Environment Variables

See `.env.example` for the full list.

## Scripts

| Script | Purpose |
|--------|---------|
| `bootstrap.sh` | First-time setup |
| `seed-d1.sh` | Apply schema + seed data to D1 |
| `check-api.sh` | Quick API endpoint health check |
| `repo-diagnostics.sh` | Check tools, files, env |
| `clean-node-modules.sh` | Remove all node_modules |

## License

MIT
