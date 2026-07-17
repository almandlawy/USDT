import type { OrderStatus } from "./constants";

export const allowedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  draft: ["quote_created", "awaiting_kyc", "awaiting_payment", "awaiting_customer", "cancelled", "expired"],
  quote_created: ["awaiting_customer", "awaiting_payment", "kyc_required", "expired", "cancelled"],
  awaiting_customer: ["awaiting_payment", "payment_pending", "expired", "cancelled"],
  awaiting_kyc: ["awaiting_payment", "kyc_required", "rejected", "cancelled"],
  kyc_required: ["awaiting_payment", "compliance_review", "cancelled", "rejected"],
  awaiting_payment: ["payment_pending", "proof_uploaded", "payment_received_pending_review", "cancelled", "expired"],
  payment_pending: ["payment_received_pending_review", "proof_uploaded", "cancelled", "expired", "under_review", "disputed"],
  proof_uploaded: ["under_review", "payment_received_pending_review", "awaiting_payment", "compliance_hold", "compliance_review", "refund_required"],
  payment_received_pending_review: [
    "under_review",
    "compliance_review",
    "compliance_hold",
    "kyc_required",
    "approved_for_fulfillment",
    "rejected",
    "refund_required",
    "disputed",
  ],
  under_review: [
    "payment_confirmed",
    "payment_received_pending_review",
    "compliance_hold",
    "compliance_review",
    "approved",
    "rejected",
    "refund_required",
    "disputed",
  ],
  payment_confirmed: ["approved", "approved_for_fulfillment", "compliance_hold", "compliance_review", "refund_required"],
  compliance_hold: ["under_review", "compliance_review", "approved", "approved_for_fulfillment", "rejected", "refund_required"],
  compliance_review: ["under_review", "approved_for_fulfillment", "rejected", "refund_required", "disputed"],
  approved: ["approved_for_fulfillment", "processing", "fulfillment_in_progress", "cancelled", "refund_required"],
  approved_for_fulfillment: ["fulfillment_in_progress", "processing", "cancelled", "refund_required"],
  fulfillment_in_progress: ["fulfilled", "completed", "compliance_hold", "refund_required", "disputed"],
  processing: ["completed", "fulfilled", "compliance_hold", "refund_required"],
  fulfilled: [],
  completed: [],
  cancelled: [],
  rejected: [],
  expired: [],
  refund_required: ["refunded", "cancelled", "completed"],
  refunded: [],
  disputed: ["under_review", "compliance_review", "refunded", "rejected", "cancelled"],
};

const LIVE_LOCKED: ReadonlySet<OrderStatus> = new Set([
  "processing",
  "completed",
  "fulfilled",
  "fulfillment_in_progress",
  "approved_for_fulfillment",
]);

export function canTransition(from: OrderStatus, to: OrderStatus, liveTrading: boolean) {
  if (!allowedTransitions[from]?.includes(to)) return false;
  if (!liveTrading && LIVE_LOCKED.has(to)) return false;
  return true;
}
