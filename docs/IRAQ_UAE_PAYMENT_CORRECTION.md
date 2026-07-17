# Iraq / UAE payment routing correction

## Iraq
- Methods: FIB, SuperQi, Zain Cash, Iraqi bank transfer
- Currency: IQD
- Stripe: hidden
- No UAE company / merchant / API secrets on customer UI
- Payment details only after order via `signed_payment_instructions`
- Reference: `GG-IQ-YYYY-XXXXXX`
- Admin: `/admin/payments/iraq`

## UAE
- Methods: Stripe (gated), e& money, du Pay, UAE bank transfer
- Currency: AED
- Reference: `GG-AE-YYYY-XXXXXX`

## Company
- `NEXT_PUBLIC_COMPANY_REFERENCE=55896311472` is opaque — not VARA/TRN/phone
- Address/VARA public only when `COMPANY_LEGAL_DETAILS_VERIFIED=true` + required fields
