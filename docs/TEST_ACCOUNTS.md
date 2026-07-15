# Test accounts

Test accounts are created only in a non-production Supabase project. The seed script refuses to run unless `ALLOW_TEST_SEED=true` and `NODE_ENV` is not production.

Set a unique temporary `TEST_USER_PASSWORD`, then run:

```bash
npm run seed:test-users
```

| Account | Role | Purpose |
|---|---|---|
| `customer@example.test` | Customer | Profile, KYC, orders, proofs and support |
| `reviewer@example.test` | Reviewer | KYC/proof/order review with limited access |
| `support@example.test` | Support | Tickets and customer support |

These addresses and passwords are placeholders, not production credentials. Delete the accounts after acceptance testing or rotate all credentials. Use separate identities to test denial cases and never grant Super Admin to the shared test users.
