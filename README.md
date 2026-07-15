# Gulf Gate Platform

A bilingual (Arabic RTL / English LTR), mobile-first request-management platform for digital-asset operations. The application supports customer onboarding, KYC, buy/sell requests, P2P case management, payment evidence, support, notifications and role-scoped administration.

> **Pre-launch invariant:** `LIVE_TRADING=false`. The project does not accept deposits, make payouts, connect wallets, release crypto or execute trades. Gulf Gate does not claim to be licensed. Activation requires documented legal approval, a Super Admin, an AAL2/2FA session and the database RPC gate.

## Stack

- Next.js 16 App Router, React 19 and TypeScript
- Supabase Auth, PostgreSQL, Storage and Row Level Security
- Zod server-side validation
- Vercel-ready deployment and security headers
- Vitest checks for the order state machine and launch lock

## Quick start

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and replace the Supabase placeholders. Keep both live-trading values `false`.
3. Run both migrations in filename order from `supabase/migrations/` using the Supabase SQL Editor or CLI.
4. Configure Auth email and/or phone providers, allowed redirect URLs and MFA.
5. Install and verify:

```bash
npm ci
npm run check
npm run dev
```

Open `http://localhost:3000/ar` or `/en`. Dashboard routes require Supabase authentication. For local UI inspection only, set `DEMO_MODE=true`; production rejects this value.

## Included controls

- Passwords handled by Supabase Auth; secure cookie-based SSR sessions
- OTP registration verification, password reset and optional customer TOTP
- Mandatory AAL2 TOTP for administration
- Same-origin checks, database-backed rate limiting and restrictive CSP
- Private storage buckets, RLS owner folders, server-verified MIME signatures and temporary signed URLs
- Least-privilege staff roles: Super Admin, Operations, Compliance, Finance, Support and Reviewer
- Database-enforced pre-launch settlement/release lock
- Append-only audit log with database triggers
- Environment validation; no service key is exposed to the browser

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Admin setup](docs/ADMIN_SETUP.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Security checklist](docs/SECURITY_CHECKLIST.md)
- [Test accounts](docs/TEST_ACCOUNTS.md)

## Important operating rule

Do not change `LIVE_TRADING`, `NEXT_PUBLIC_LIVE_TRADING` or the `site_settings.live_trading` row to `true` until qualified Iraqi legal counsel, compliance and technical security reviewers approve the exact operating model. The environment flags alone do not activate execution; the database RPC is the authoritative gate.
