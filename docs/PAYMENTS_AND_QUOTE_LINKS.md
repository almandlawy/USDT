# Multi-country payments & Secure Quote Links

## Locks (must remain)
- `LIVE_TRADING=false`
- `NEXT_PUBLIC_LIVE_TRADING=false`
- `REAL_PAYMENTS_ENABLED=false`
- `AUTO_FULFILLMENT_ENABLED=false` (build/runtime fail-closed if true)
- `STRIPE_ENABLED=false` / `STRIPE_CRYPTO_APPROVED=false` until official Stripe crypto approval
- `ZAINCASH_ENABLED=false` until merchant UAT + production credentials
- No hot-wallet keys in repo; `LockedFulfillmentProvider` refuses auto-send

## Migrations
- `202607150013_order_status_extensions.sql`
- `202607150014_multi_country_payments_and_quotes.sql`

## Payment success path
Webhook (or human proof review) → `payment_received_pending_review`  
Never auto → `completed` / `fulfilled` without live trading + human tx hash.

## Manual credentials still required
- Stripe secret + webhook secret + crypto approval letter
- Zain Cash OAuth client + base URL + webhook secret
- e& money phone/QR (admin)
- du Pay phone/QR (admin)
- Bank account rows (admin)
- Legal name + privacy email for proof intake gate

## Rollback
1. Revert deploy to previous Production SHA on Vercel (`gulf-gate-platform` / `main`).
2. Keep `REAL_PAYMENTS_ENABLED=false` and provider enables false.
3. Do not roll back DB enums; new statuses are additive. Disable quote_links / matrix rows via admin if needed.
