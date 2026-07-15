# Security checklist

## Before every production release

- [ ] `npm run check` passes on the exact commit.
- [ ] `LIVE_TRADING=false` and `NEXT_PUBLIC_LIVE_TRADING=false`.
- [ ] No wallet keys, exchange keys, payment secrets or service-role keys exist in frontend bundles.
- [ ] Supabase redirect URLs contain only approved domains.
- [ ] All public tables have RLS enabled and policies were tested with customer, each staff role and anonymous sessions.
- [ ] Storage buckets are private; owner-folder and staff policies are tested.
- [ ] Signed URL TTL is 15–300 seconds and responses are not cached.
- [ ] Upload type, size and binary signature validation is enabled.
- [ ] Every administrator uses TOTP and reaches AAL2.
- [ ] Rate limits, secure cookie flags, CSRF same-origin checks and CSP headers are present.
- [ ] Audit log UPDATE/DELETE attempts fail.
- [ ] Order `processing`/`completed` and P2P `released` fail while pre-launch is active.
- [ ] Login alerts and security monitoring have an operational owner.
- [ ] Backups, recovery test, incident response and access-revocation procedures are current.
- [ ] Qualified counsel approved current public disclosures; no licence claim appears.

## Periodic operations

- Review staff roles and active sessions quarterly.
- Rotate server secrets and provider credentials.
- Re-test RLS after every schema change.
- Remove orphaned private uploads using a scheduled, audited server job.
- Monitor failed authentication, rate-limit and compliance events.
- Run dependency and application security scanning in CI.
