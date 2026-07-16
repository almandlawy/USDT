# Production deployment alignment

## Root cause (2026-07-16 incident pattern)

Production alias `gulf-gate-platform.vercel.app` can briefly serve an older Vercel deployment while GitHub `main` already contains newer commits. Content markers (`EMAIL VERIFIED`, phone login, short legal pages) indicate an old revision even when GitHub Actions “production-smoke” is green, because smoke previously hit the alias without verifying `VERCEL_GIT_COMMIT_SHA === GITHUB_SHA`.

## Correct project

- Vercel project: `gulf-gate-platform`
- Production branch: `main`
- Production alias: `https://gulf-gate-platform.vercel.app`

## Exact-SHA gate

After merge to `main`, CI:

1. Builds and runs desktop/mobile Playwright against a local production build.
2. Polls `/api/internal/health` with `INTERNAL_HEALTH_TOKEN` for up to ~10 minutes.
3. Requires `version.commitSha === github.sha` and `liveTradingLocked === true`.
4. Then runs production signature Playwright against the alias.
5. Uploads smoke artifacts (SHA report, internal health JSON, Playwright traces).

## Required GitHub secret

- `INTERNAL_HEALTH_TOKEN` — same value as Vercel Production env (min 32 chars).

## Required Vercel Production env (names only)

- `LIVE_TRADING=false`
- `NEXT_PUBLIC_LIVE_TRADING=false`
- `SECURITY_HASH_SECRET` (≥32)
- `INTERNAL_HEALTH_TOKEN` (≥32)
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `KYC_INTAKE_ENABLED=false` (until legal readiness)
- `PROOF_INTAKE_ENABLED=false` (until legal readiness)
- Supabase public URL + publishable key
- Optional contact `NEXT_PUBLIC_*` fields when approved

## Supabase

Apply migrations in order through `202607150011_kyc_customer_reason_and_data_requests.sql`. Confirm `site_settings.live_trading = false` and `schema_migration_marker` includes `202607150011`.

## Rollback

Keep the previous Vercel deployment; promote it via the Vercel dashboard if a bad alias promotion is detected. Do not delete prior deployments. Database changes are additive — prefer roll-forward.
