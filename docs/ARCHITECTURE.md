# Architecture

## Request flow

1. Supabase Auth verifies email or phone and maintains the SSR session in secure cookies.
2. The Next.js proxy refreshes the session, applies locale routing and emits a nonce-based Content Security Policy.
3. Server Components gate client and staff areas. Staff access requires an allowed role and AAL2.
4. Server Actions validate origin, user, rate limit and Zod payload before database writes.
5. Files upload directly from the authenticated browser to the user's RLS-restricted private folder. A Server Action then verifies object ownership, size, MIME type, binary signature and SHA-256 before inserting metadata.
6. RLS is the final authorization boundary for database rows and Storage objects.

## Data domains

- Identity: `profiles`, `kyc_cases`, `kyc_documents`
- Requests: `orders`, `order_events`, `payment_proofs`
- P2P: `p2p_offers`, `p2p_orders`, `p2p_evidence`, `disputes`
- Operations: `payment_methods`, `pricing_settings`, `wallet_addresses`, `compliance_alerts`
- Service: `support_tickets`, `ticket_messages`, `notifications`
- Governance: `staff_roles`, `site_settings`, `audit_logs`, `rate_limit_events`

## Live-trading lock

The public UI, Server Actions and database independently assume pre-launch. PostgreSQL triggers reject settlement fields, `processing`, `completed` and P2P `released` while `site_settings.live_trading=false`. Only `set_live_trading()` can change the authoritative flag, and it checks Super Admin role, AAL2 and a non-trivial legal approval reference.

## Private files

`kyc-documents`, `payment-proofs` and `payment-method-qr` are non-public buckets. Customer objects are stored under `<auth.uid()>/<uuid>.<ext>`. Access is through owner/staff RLS and `/api/files/<bucket>/<path>`, which issues a short-lived signed redirect after authentication.
