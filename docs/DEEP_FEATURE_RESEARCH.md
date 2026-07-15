# Gulf Gate deep feature research

Research date: 2026-07-15. Only product and architecture patterns were adapted. No third-party branding, private logic, credentials or complete modules were copied.

## Patterns selected

### Institutional RFQ lifecycle

Kraken Institutional describes OTC as negotiated, off-book block trading with quote request, acceptance and reconciliation. Gulf Gate adopts only the request/quote/accept/expire presentation and audit lifecycle; it does not reconcile or execute a trade.

Source: https://docs.kraken.com/institutional/api-reference

### Four-eyes approval

Coinbase Prime documents consensus approval and activity records for sensitive actions. Gulf Gate applies the safer organizational pattern to demo order approval: the requester cannot approve their own request, the decision requires AAL2, expires, and is audit logged. No wallet or withdrawal feature is implemented.

Sources:
- https://docs.cdp.coinbase.com/prime/concepts/activities
- https://docs.cdp.coinbase.com/prime/concepts/transactions/withdrawals

### Compliance Case 360 and mandatory checklist

Sumsub Case Management combines alerts, applicant information and assignment into one investigation. Its case checklist standardizes mandatory resolution steps. Gulf Gate adds cases with risk score/band, SLA, assignee, resolution, and required checklist items.

Sources:
- https://docs.sumsub.com/docs/case-management
- https://docs.sumsub.com/docs/case-checklist
- https://docs.sumsub.com/docs/applicant-risk-scoring

### P2P merchant intelligence

Binance P2P merchant documentation emphasizes completion, payment/release time, feedback, report and appeal metrics. Gulf Gate stores periodic scorecards with completion, appeal, feedback, response and risk indicators. No automatic ranking may bypass manual merchant approval.

Sources:
- https://www.binance.com/en/support/faq/detail/af71c0674dd64af1affd210df148cdf5
- https://www.binance.com/en/support/faq/detail/360043895111

### Defense in depth

Supabase recommends RLS combined with Auth and uses AAL2 to represent a session verified by a second factor. Every new sensitive table has RLS; checklist and approval decisions require AAL2 in database functions, not only in UI.

Sources:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/auth-mfa

## Features deliberately excluded

- Live order matching or exchange order books.
- Deposits, payouts, custody and hot wallets.
- On-chain escrow or automatic USDT release.
- Automated sanctions decisions without a contracted compliance provider and legal policy.
- Device fingerprinting without a privacy assessment, consent text and approved vendor.
- Claims that Gulf Gate is licensed or regulated.

## Resulting Gulf Gate differentiators

1. Operations Intelligence dashboard with global customer/reference search.
2. Explainable risk band, SLA deadline and standardized case checklist.
3. Four-eyes demo approval with maker/checker separation and AAL2.
4. Merchant performance and appeal-risk scorecards.
5. Customer Trust Passport showing KYC level, security posture, legal acceptance and demo limits.
