export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const ORDER_STATUSES = [
  "draft", "awaiting_kyc", "awaiting_payment", "proof_uploaded", "under_review",
  "payment_confirmed", "compliance_hold", "approved", "processing", "completed",
  "cancelled", "rejected", "refund_required",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STAFF_ROLES = ["super_admin", "operations", "compliance", "finance", "support", "reviewer"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const FIAT_CURRENCIES = ["USD", "AED", "IQD"] as const;
export const NETWORKS = ["TRC20", "ERC20"] as const;
export const PAYMENT_CODES = ["bank_transfer", "fib", "superqi", "zain_cash", "cash_representative", "wallet_transfer"] as const;

export const PRELAUNCH_NOTICE = {
  ar: "نسخة ما قبل الإطلاق — لا يتم تنفيذ إيداعات أو مدفوعات أو تحويلات أو إطلاق أصول رقمية حقيقية.",
  en: "Pre-launch — no real deposits, payouts, transfers or digital-asset releases are executed.",
};
