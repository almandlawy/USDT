# Deployment guide

## Supabase

1. Create separate development, staging and production projects.
2. Apply `supabase/migrations/202607150001_initial_schema.sql` to each environment in order.
3. Confirm RLS is enabled on every public table and all three Storage buckets are private.
4. Configure email and/or phone providers, OTP templates, redirect URLs and TOTP MFA.
5. Add the Vercel preview and production callback URLs to the Auth allow list.
6. Set SMTP/SMS rate limits and monitor authentication abuse.

## Vercel

1. Import the repository as a Next.js project.
2. Add values from `.env.example` to the appropriate Preview and Production environments.
3. Keep `LIVE_TRADING=false`, `NEXT_PUBLIC_LIVE_TRADING=false`, `DEMO_MODE=false` and `LEGAL_APPROVAL_REFERENCE` empty.
4. Never create a `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`; the service role is server-only and only needed for controlled seed scripts.
5. Run `npm run check` in CI before deployment.
6. Deploy first to Preview, test Arabic/English, mobile layouts, Auth, RLS and private file access, then promote.

## Domain cutover

After the Vercel production deployment is verified, add `YOUR_APPROVED_CUSTOM_DOMAIN` in Vercel and follow its DNS instructions in Namecheap Advanced DNS. Enable SSL and verify HSTS behavior before removing the old hosting files. Keep a backup and avoid destructive cPanel changes until the new deployment is healthy.

## Rollback

Use Vercel deployment rollback for application regressions. Database migrations must be forward-fixed; do not destructively roll back audit or customer data. Disabling service execution is always safe: set the authoritative database flag false through a controlled Super Admin AAL2 session.
