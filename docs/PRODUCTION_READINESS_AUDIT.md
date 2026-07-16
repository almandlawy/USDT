# Production readiness audit — Gulf Gate (2026-07-16)

Scope: Pre-launch hardening. `LIVE_TRADING` remains locked. Fixes applied in branch `cursor/production-readiness-hardening-c99b`.

## Critical

| Issue | Files | Fix | Test |
|---|---|---|---|
| Audit `actor_role` stored JWT AAL (`aal1`/`aal2`) instead of staff role | `202607150001` `audit_critical_change` | Migration `010` rewrites function to use `staff_roles` | SQL/unit migration invariant |
| Login fingerprint stored plaintext IP:UA in `*_hash` columns | `request.ts`, auth actions | HMAC-SHA256 via `SECURITY_HASH_SECRET`; separate ip/ua hashes | `security-hash.test.ts` |

## High

| Issue | Files | Fix | Test |
|---|---|---|---|
| Auth inconsistency: login phone + OTP dead code + EMAIL VERIFIED | auth pages/actions | Email-only register/login; remove OTP; accurate copy | Playwright auth + unit |
| Staff can SELECT all customer notifications | migration `009` | Scoped RLS by `kind` + role in `010` | migration invariants |
| FX `notes`/`updated_by` public via RLS | migration `008` | Public view `market_fx_public`; revoke broad select | migration invariants |
| Fake BTC/ETH prices on provider failure | `market-data.ts` | Unavailable state; USDT indicative only | `market-data` tests |
| Health exposes commit/deployment/email/storage | `/api/health` | Minimal public + internal token route | Playwright health |

## Medium

| Issue | Files | Fix | Test |
|---|---|---|---|
| CSRF allows any `*.vercel.app` | `request.ts` | Allow configured hosts + `VERCEL_URL` + optional allowlist | unit |
| Missing HSTS in app headers | `next.config.ts` | Add HSTS in production | config review |
| Legal pages incomplete | legal page | Expand cookies/retention/AUP/complaints/deletion | sitemap + e2e |
| No CAPTCHA on open registration | auth | Cloudflare Turnstile server verify | unit + e2e soft |
| Derived IQD marked fully stale | `market-data.ts` | `live_with_derived_fx` status | unit |

## Low

| Issue | Files | Fix |
|---|---|---|
| Old domain in docs | DEPLOYMENT/SEO docs | `YOUR_APPROVED_CUSTOM_DOMAIN` |
| Login runs full password complexity schema | actions | Login: non-empty password only |
| Register auto-login attempt for existing email | actions | Clear message + links only |

## Manual (Supabase / Vercel)

1. Apply migrations `008`, `009`, `010` in order (SQL editor).
2. Set Vercel secrets: `SECURITY_HASH_SECRET`, `TURNSTILE_*`, `INTERNAL_HEALTH_TOKEN`.
3. Supabase Auth: Confirm email OFF for current UX; Site URL + Redirect URLs = production host.
4. Keep `LIVE_TRADING=false` and `NEXT_PUBLIC_LIVE_TRADING=false`.
5. Contact/legal env vars when approved — never invent license numbers.

## Confirmation

- Live trading remains disabled in UI, server actions, and PostgreSQL locks.
- No real USDT send/release paths added.
