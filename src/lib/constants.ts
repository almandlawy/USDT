export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const ORDER_STATUSES = [
  "draft",
  "quote_created",
  "awaiting_customer",
  "awaiting_kyc",
  "kyc_required",
  "awaiting_payment",
  "payment_pending",
  "proof_uploaded",
  "payment_received_pending_review",
  "under_review",
  "payment_confirmed",
  "compliance_hold",
  "compliance_review",
  "approved",
  "approved_for_fulfillment",
  "fulfillment_in_progress",
  "processing",
  "fulfilled",
  "completed",
  "cancelled",
  "rejected",
  "expired",
  "refund_required",
  "refunded",
  "disputed",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STAFF_ROLES = ["super_admin", "operations", "compliance", "finance", "support", "reviewer"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const FIAT_CURRENCIES = ["USD", "AED", "IQD", "SAR", "QAR", "KWD", "BHD", "OMR", "EUR", "GBP"] as const;
export const NETWORKS = ["TRC20", "ERC20", "BEP20"] as const;
export const PAYMENT_CODES = [
  "bank_transfer",
  "fib",
  "superqi",
  "zain_cash",
  "cash_representative",
  "wallet_transfer",
  "stripe_card",
  "eand_money",
  "dupay",
  "manual_proof",
] as const;

export const PRELAUNCH_NOTICE = {
  ar: "نسخة ما قبل الإطلاق — لا يتم تنفيذ إيداعات أو مدفوعات أو تحويلات أو إطلاق أصول رقمية حقيقية.",
  en: "Pre-launch — no real deposits, payouts, transfers or digital-asset releases are executed.",
};
