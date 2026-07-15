# Gulf Gate operations workflows

## Operations queue
`/[locale]/admin/ops` combines pending KYC, active demo orders, proofs and disputes. Staff can filter, inspect private evidence through signed URLs, assign work and apply review transitions. Assignments and notes are audit logged.

## Quote and timeline
Orders store a separately labelled office quote and expiry. CoinGecko remains indicative only. `accept_demo_quote` accepts an unexpired demo quote without moving money or releasing assets. Settlement states remain blocked while live trading is false.

## KYC levels
L0 is registered, L1 is verified contact, L2 is approved individual identity, and L3 is enhanced/business approval. `kyc_level_limits` stores per-order and daily USD/AED/IQD caps. Limits are checked in the server action and by a database trigger.

## Managed P2P
Only approved offers are usable. Offer details show price, limits, city, rating and completion rate. Orders retain a timer and dispute workflow; automatic release remains prohibited.

## Notifications and chat
New KYC, order, proof and dispute events create in-app staff notifications. Order messages are text-only, RLS-protected and audit logged. No external webhook is configured.

## Batches and exports
`/[locale]/admin/matching` groups buy/sell orders into review batches. The CSV API requires a staff role and AAL2.
