# Cloudflare Bindings Reference

## Worker: parthub-api

| Binding | Type | Name |
|---------|------|------|
| DB | D1 | parthub-db |
| MEDIA | R2 | parthub-media |
| KV | KV Namespace | parthub-kv |

## Secrets (via wrangler secret put)

```bash
wrangler secret put JWT_SECRET
wrangler secret put WHATSAPP_ACCESS_TOKEN
wrangler secret put WHATSAPP_PHONE_NUMBER_ID
```

## Pages Projects

| Project | Domain |
|---------|--------|
| parthub-storefront | parthub.site |
| parthub-seller | seller.parthub.site |
| parthub-admin | admin.parthub.site |

## D1 Setup

```bash
wrangler d1 create parthub-db
wrangler d1 execute parthub-db --file=infra/d1/schema.sql
wrangler d1 execute parthub-db --file=infra/d1/indexes.sql
wrangler d1 execute parthub-db --file=infra/d1/seed.sql
```

## R2 Setup

```bash
wrangler r2 bucket create parthub-media
```

## KV Setup

```bash
wrangler kv:namespace create KV
```
