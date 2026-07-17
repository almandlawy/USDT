/**
 * Payment / fulfillment feature gates.
 * Defaults keep real charges and auto-send locked.
 * Safe to import from Client Components: missing env vars evaluate to false.
 */
export function isRealPaymentsEnabled(): boolean {
  return process.env.REAL_PAYMENTS_ENABLED === "true";
}

export function isAutoFulfillmentEnabled(): boolean {
  return process.env.AUTO_FULFILLMENT_ENABLED === "true";
}

export function isStripeEnabled(): boolean {
  return process.env.STRIPE_ENABLED === "true";
}

export function isStripeCryptoApproved(): boolean {
  return process.env.STRIPE_CRYPTO_APPROVED === "true";
}

/** Stripe may create real checkouts only when all three gates are true. */
export function canUseStripeCheckout(): boolean {
  return isStripeEnabled() && isStripeCryptoApproved() && isRealPaymentsEnabled();
}

export function isZainCashEnabled(): boolean {
  return process.env.ZAINCASH_ENABLED === "true";
}

export function canUseZainCashCheckout(): boolean {
  return isZainCashEnabled() && isRealPaymentsEnabled();
}

export function isEandMoneyEnabled(): boolean {
  return process.env.EAND_MONEY_ENABLED === "true";
}

export function eandMoneyMode(): "manual" | "api" {
  return process.env.EAND_MONEY_MODE === "api" ? "api" : "manual";
}

export function isDuPayEnabled(): boolean {
  return process.env.DUPAY_ENABLED === "true";
}

export function duPayMode(): "manual" | "api" {
  return process.env.DUPAY_MODE === "api" ? "api" : "manual";
}

export function isBankTransferEnabled(): boolean {
  return process.env.BANK_TRANSFER_ENABLED === "true";
}

export function quoteDefaultExpirySeconds(): number {
  const raw = Number(process.env.QUOTE_DEFAULT_EXPIRY_SECONDS || 300);
  if (!Number.isFinite(raw) || raw < 60) return 300;
  return Math.min(raw, 3600);
}

export function marketPriceMaxAgeSeconds(): number {
  const raw = Number(process.env.MARKET_PRICE_MAX_AGE_SECONDS || 120);
  if (!Number.isFinite(raw) || raw < 30) return 120;
  return Math.min(raw, 3600);
}

export function stripeAvailabilityMessage(locale: "ar" | "en"): string {
  return locale === "ar"
    ? "الدفع بالبطاقة غير متاح حالياً لهذا النوع من الطلبات."
    : "Card payment is not currently available for this type of order.";
}

export function paymentReadinessSnapshot() {
  return {
    realPaymentsEnabled: isRealPaymentsEnabled(),
    autoFulfillmentEnabled: isAutoFulfillmentEnabled(),
    stripeEnabled: isStripeEnabled(),
    stripeCryptoApproved: isStripeCryptoApproved(),
    stripeCheckoutAllowed: canUseStripeCheckout(),
    zainCashEnabled: isZainCashEnabled(),
    zainCashCheckoutAllowed: canUseZainCashCheckout(),
    eandMoneyEnabled: isEandMoneyEnabled(),
    eandMoneyMode: eandMoneyMode(),
    duPayEnabled: isDuPayEnabled(),
    duPayMode: duPayMode(),
    bankTransferEnabled: isBankTransferEnabled(),
    liveTrading: process.env.LIVE_TRADING === "true",
  };
}
