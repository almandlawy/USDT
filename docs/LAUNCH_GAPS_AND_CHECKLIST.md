# Gulf Gate — launch gaps and activation checklist

Updated after the unified visual redesign and payment-readiness audit.

## Current code status

- Unified ivory / gold / charcoal identity is merged.
- Arabic RTL and English LTR routes exist.
- Client and staff dashboards, KYC, proofs, support, notifications and audit flows exist.
- Multi-country payment matrix and Secure Quote Links exist.
- Stripe and Zain Cash adapters and webhook routes exist behind fail-closed flags.
- FIB and SuperQi are currently **manual proof routes**, not automatic API integrations.
- e& money and du Pay are currently **manual proof routes**, unless a later official merchant API is implemented.
- Automatic USDT fulfillment is locked and no wallet private keys are stored.

## Must complete in Supabase

1. Apply migrations in order through:
   - `202607150016_payment_account_fail_closed_sync.sql`
2. Run `supabase/verify-production.sql` and require `OVERALL_PASS`.
3. Confirm these buckets are private:
   - `kyc-documents`
   - `payment-proofs`
   - `p2p-evidence`
4. Confirm `site_settings.live_trading = false`.
5. Confirm `schema_migration_marker >= 202607150016`.
6. Configure staff users and require AAL2 for critical staff actions.
7. Populate `country_payment_accounts` with encrypted payment details before enabling a method.

Migration 016 disables seeded manual payment placeholders that do not contain encrypted account details or a configured QR asset. Enabling an Iraq payment account from admin also requires real stored payment details.

## Must complete in Vercel

Server-only secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SECURITY_HASH_SECRET` — at least 32 characters
- `INTERNAL_HEALTH_TOKEN` — at least 32 characters
- `TURNSTILE_SECRET_KEY`
- Provider secrets and webhook secrets

Public configuration:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- Approved company/contact fields

Keep these fail closed until the relevant launch gate is complete:

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
- Final review of terms, privacy, risk, complaints, retention and acceptable-use pages by counsel

Set `COMPANY_LEGAL_DETAILS_VERIFIED=true` only after the public fields match the official documents exactly.

## Provider activation status

### Stripe

Code exists, but activation still requires all of the following:

- `STRIPE_ENABLED=true`
- `STRIPE_CRYPTO_APPROVED=true`
- `REAL_PAYMENTS_ENABLED=true`
- Production secret key
- Production webhook secret
- Verified webhook delivery and idempotency tests

A successful charge must remain `payment_received_pending_review`; it must not auto-complete an order.

### Zain Cash

Automatic adapter exists, but requires official production endpoints and credentials. Until then, use a configured manual account row with proof review.

### FIB and SuperQi

Current implementation is manual only:

- encrypted account/payment instructions in `country_payment_accounts`
- per-order signed instructions
- proof upload
- human review

Automatic FIB/SuperQi checkout, callback verification and refund/reversal APIs are still missing because official merchant API documentation and credentials have not been supplied to the repository.

### e& money and du Pay

Current implementation is manual only. Do not change the mode to API until official merchant API documentation, credentials and webhook verification are available.

### Bank transfer

Add real bank-account rows through admin. Do not enable a bank route with an empty account payload.

## Operational work before accepting real money

- Test one complete order per country and payment method in a non-production environment.
- Test expired and single-use quote links.
- Test duplicate and replayed webhooks.
- Test payment amount/currency mismatches.
- Test wrong wallet network and duplicate wallet confirmation.
- Establish dual approval for large manual fulfillment.
- Define daily and monthly limits by KYC status.
- Define refund, dispute and failed-payment procedures.
- Configure alerts for failed webhooks, repeated login failures and compliance holds.
- Create a daily reconciliation report: provider transaction, order reference, fiat amount, USDT amount and transaction hash.
- Create backup staff accounts and verify recovery procedures.

## Production acceptance criteria

The platform is ready for controlled real-payment intake only when:

1. Vercel deployment serves the exact merged SHA.
2. CI and production smoke tests pass.
3. Supabase verification returns `OVERALL_PASS`.
4. Legal/company fields are verified.
5. The selected provider is configured and tested.
6. Payment methods without real account details are disabled.
7. KYC and proof gates match the approved operating procedure.
8. Human fulfillment and transaction-hash audit procedures are staffed.

`AUTO_FULFILLMENT_ENABLED` remains false.
