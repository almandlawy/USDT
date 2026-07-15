# Administration setup

## First Super Admin

1. Apply the database migration.
2. Enable email authentication and TOTP MFA in Supabase.
3. Put the server-only service role key, a real seed email and a unique 16+ character password in `.env.local`.
4. Run `npm run seed:admin` from a trusted local machine. Never run it from client code or expose the service role key.
5. Sign in at `/ar/login` or `/en/login`, open Security and enroll an authenticator.
6. Sign out and sign in again, complete the TOTP challenge, then open `/ar/admin`.
7. Remove seed credentials from the environment and rotate the password.

## Staff roles

Grant roles only after the user account exists. Use a controlled SQL session or a dedicated future role-management workflow. Suggested scope:

| Role | Scope |
|---|---|
| Super Admin | Governance, staff and activation gate |
| Operations | Orders and P2P operations |
| Compliance | KYC, risk alerts and audit review |
| Finance | Proofs, payment methods, pricing and fees |
| Support | Tickets and customer assistance |
| Reviewer | Assigned KYC, proofs and order review |

All admin users must enroll TOTP. Review `staff_roles` quarterly and immediately revoke dormant access.

## Payment methods

The migration creates Bank Transfer, FIB, SuperQi, Zain Cash, Cash Representative and Wallet Transfer records as inactive. Finance or Super Admin may configure names, holder, masked account number, instructions, limits, currencies and cities. Do not store full secrets in the visible account-number field. Keep every method inactive during pre-launch.

## Activation procedure

Activation is intentionally not a routine admin task. Obtain written legal and technical approval, archive the approval reference, confirm AML/KYC operations and incident response, require a Super Admin AAL2 session, then use the activation form. Re-run the security checklist before any change.
