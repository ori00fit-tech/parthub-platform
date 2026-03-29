# Seller Workflow

## Onboarding
1. Register with role=seller at storefront /auth
2. Go to seller.parthub.site → auto-redirect to /auth
3. Login with seller credentials
4. POST /api/v1/marketplace/sellers/onboard with store name
5. Status starts as `pending` → Admin approves → `active`

## Listing a Part
1. Dashboard → Add New Part
2. Fill: title, category, price, condition, quantity
3. Upload images (up to 8)
4. Add compatibility: make/model/year ranges
5. Add specs (optional)
6. Submit → status: `pending` → Admin approves → `active`

## Managing Orders
1. Orders tab shows all orders containing seller's parts
2. Seller updates shipping status
3. WhatsApp notification sent to buyer on status change
