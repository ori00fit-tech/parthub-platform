# PartHub Architecture Overview

## System Design

```
Browser
  │
  ├── storefront (CF Pages) → parthub.site
  ├── seller-portal (CF Pages) → seller.parthub.site
  └── admin (CF Pages) → admin.parthub.site
          │
          ▼
      Cloudflare Worker (Hono API)
          │
          ├── D1 (SQLite) — relational data
          ├── R2 — media storage
          └── KV — cache / session hints
```

## Auth Flow

1. User POSTs /api/v1/auth/login
2. API returns JWT (HS256, CF Web Crypto)
3. Token stored in localStorage with app-specific key:
   - Buyer: `ph_buyer_access_token`
   - Seller: `ph_seller_access_token`
   - Admin: `ph_admin_access_token`
4. Each request sends `Authorization: Bearer <token>`
5. `authMiddleware` verifies & sets context variables

## Vehicle Compatibility Flow

1. User selects Make → Model → Year in VehicleSelector
2. Selection saved to localStorage (`ph_saved_vehicles`)
3. Parts list filtered via `part_compatibility` table
4. PartDetailsPage shows ✓ or ⚠ badge per selected vehicle

## Order Flow

1. Buyer adds parts to cart (localStorage)
2. POST /api/v1/commerce/orders with items + address
3. API validates stock, creates order + items + address
4. Stock decremented atomically
5. Order reference generated: PH-YYYY-NNNNN
6. Optional: WhatsApp notification via Meta Cloud API

## Media Flow

1. Seller uploads via POST /api/v1/media/upload (multipart)
2. API validates mime + size
3. File stored in R2: `parts/{seller_id}/{part_id}/{timestamp}.webp`
4. URL recorded in `part_images` table
5. Public URL served via `media.parthub.site` (R2 custom domain)
