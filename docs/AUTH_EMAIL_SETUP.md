# Auth & email setup (no secrets)

## Recommended pre-launch Auth model
- Sign-up: email + password
- Sign-in: email + password
- Confirm email: **disabled** in Supabase for direct dashboard access
- Password recovery: email magic link via Supabase Auth templates

## Supabase Auth settings
1. Authentication → Providers → Email enabled
2. Confirm email: OFF (current product UX)
3. Secure password change: ON
4. Site URL: `https://gulf-gate-platform.vercel.app` (or `YOUR_APPROVED_CUSTOM_DOMAIN`)
5. Redirect URLs include:
   - `https://gulf-gate-platform.vercel.app/auth/callback`
   - `https://gulf-gate-platform.vercel.app/**`
   - Preview URLs only if needed for QA

## Custom SMTP (required for reliable recovery email)
Configure Authentication → Emails → SMTP with your provider.
Until SMTP is configured, recovery emails may not arrive. Public health does not expose SMTP status; internal health reports `emailConfigured`.

## App environment
- `NEXT_PUBLIC_APP_URL` must match the browser origin used for auth callbacks
- Never put service-role keys in `NEXT_PUBLIC_*`
- Turnstile keys optional until provisioned; when set, auth forms require CAPTCHA

## Operator note
If users see “email confirmation required”, Confirm email is still ON in Supabase — disable it or complete the confirmation link flow.
