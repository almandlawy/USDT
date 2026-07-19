# Gulf Gate — final launch gaps and activation checklist

Updated after the unified visual redesign, payment-readiness audit, and country-payment admin hardening.

## Current code status

- Unified ivory / gold / charcoal identity is merged.
- Arabic RTL and English LTR routes exist.
- Client and staff dashboards, KYC, proofs, support, notifications and audit flows exist.
- Multi-country payment matrix and Secure Quote Links exist.
- Dedicated payment administration exists at:
  - `/admin/payments/iraq`
  - `/admin/payments/uae`
- Stripe and Zain Cash adapters and webhook routes exist behind fail-closed flags.
- FIB and SuperQi are **manual proof routes**, not automatic API integrations.
- e& money and du Pay are **manual proof routes** unless an official merchant API is implemented later.
- Bank routes require encrypted account details before they can be enabled.
- Automatic USDT fulfillment is locked and no wallet private keys are stored.

## Database safeguards now included

- Migration 015 accepts `api`, `manual`, and `disabled` modes and can recover from a partially-created payment table.
- All Iraq and UAE payment-account placeholders are seeded disabled.
- Migration 016 prevents an enabled manual method without encrypted details or a configured QR asset.
- API mode is rejected for providers without an implemented adapter. The only implemented API modes are:
  - Stripe for UAE/global approved routing
  - Zain Cash for Iraq
- A database trigger synchronizes configured country accounts with public payment availability.
- Public payment selection fails closed when no configured matrix exists.

## Must complete in Supabase

1. Apply migrations in order through:
   - `202607150015_iraq_uae_payment_routing_correction.sql`
   - `202607150016_payment_account_fail_closed_sync.sql`
2. Run `supabase/verify-production.sql` and require `OVERALL_PASS`.
3. Confirm these buckets are private:
   - `kyc-documents`
   - `payment-proofs`
   - `p2p-evidence`
4. Confirm `site_settings.live_trading = false`.
5. Confirm `schema_migration_marker >= 202607150016`.
6. Configure staff users and require AAL2 for critical staff actions.
7. Enter real payment details through the Iraq/UAE admin pages before enabling manual methods.

Do not enable payment rows directly in SQL unless the same database readiness rules are satisfied.

## Must complete in Vercel

Server-only secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SECURITY_HASH_SECRET` — at least 32 characters
- `INTERNAL_HEALTH_TOKEN` — at least 32 characters
- `TURNSTILE_SECRET_KEY`
- Provider credentials and webhook secrets

Public configuration:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- Approved company/contact fields

Keep these fail closed until the matching operational gate is complete:

```env
NEXT_PUBLIC_LIVE_TRADING=false
LIVE_TRADING=false
REAL_PAYMENTS_ENABLED=false
AUTO_FULFILLMENT_ENABLED=false
NEXT_PUBLIC_KYC_INTAKE_ENABLED=false
KYC_INTAKE_ENABLED=false
NEXT_PUBLIC_PROOF_INTAKE_ENABLED=false
PROOF_INTAKE_ENABLED=false
```

Add the same `INTERNAL_HEALTH_TOKEN` to GitHub Actions so the post-merge production smoke test can verify the exact deployed SHA.

## Legal and company data still required

Use the exact wording from official documents. Do not infer the type of the supplied reference `55896311472`.

Required before public legal disclosure or document intake:

- Full legal company name
- Trade licence number and issuing authority
- VARA licence number, licence type, licensed activities and customer restrictions
- Licence validity dates
- Verified English legal address
- Support email
- Privacy/data-request email
- Support phone and working hours
- Legal approval reference stored internally
- Final legal review of terms, privacy, risk, complaints, retention and acceptable-use pages

Set `COMPANY_LEGAL_DETAILS_VERIFIED=true` only after public fields match the official documents exactly.

## Provider activation status

### Stripe

Code and UAE administration exist, but activation still requires:

- `STRIPE_ENABLED=true`
- `STRIPE_CRYPTO_APPROVED=true`
- `REAL_PAYMENTS_ENABLED=true`
- Production secret key
- Production webhook secret
- Verified webhook delivery, replay protection and idempotency tests

A successful charge must remain `payment_received_pending_review`; it must not auto-complete an order.

### Zain Cash

The automatic adapter exists, but requires official production endpoints, credentials and webhook secret. Until then, configure Zain Cash as a manual Iraq route with proof review.

### FIB and SuperQi

Current implementation is manual only:

- encrypted account/payment instructions in `country_payment_accounts`
- per-order signed instructions
- proof upload
- human review

Automatic FIB/SuperQi checkout, callback verification, transaction inquiry and refund/reversal APIs remain missing because official merchant API documentation and credentials have not been supplied to the repository.

### e& money and du Pay

Current implementation is manual only. Do not represent either route as an API integration or partnership until official merchant API documentation, credentials and webhook verification are available.

### Bank transfer

Add real bank-account rows through the country admin pages. Empty manual accounts cannot be enabled by the application or database.

## Operational work before accepting real money

- Test one complete order per country and payment method in a non-production environment.
- Test expired, cancelled and single-use quote links.
- Test duplicate and replayed webhooks.
- Test payment amount and currency mismatches.
- Test wrong wallet network and duplicate wallet confirmation.
- Establish dual approval for large manual fulfillment.
- Define daily and monthly limits by KYC status.
- Define refund, dispute and failed-payment procedures.
- Configure alerts for failed webhooks, repeated login failures and compliance holds.
- Create a daily reconciliation report containing provider transaction, order reference, fiat amount, USDT amount and transaction hash.
- Create backup staff accounts and verify recovery procedures.

## Production acceptance criteria

The platform is ready for controlled real-payment intake only when:

1. Vercel serves the exact merged SHA.
2. CI and production smoke tests pass.
3. Supabase verification returns `OVERALL_PASS`.
4. Legal/company fields are verified.
5. The selected provider is configured and tested.
6. Payment methods without real details remain disabled.
7. KYC and proof gates match the approved operating procedure.
8. Human fulfillment and transaction-hash audit procedures are staffed.

`AUTO_FULFILLMENT_ENABLED` remains false.
