import type { OrderStatus } from "./constants";

export const allowedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  draft: ["awaiting_kyc", "awaiting_payment", "cancelled"],
  awaiting_kyc: ["awaiting_payment", "rejected", "cancelled"],
  awaiting_payment: ["proof_uploaded", "cancelled"],
  proof_uploaded: ["under_review", "refund_required"],
  under_review: ["payment_confirmed", "compliance_hold", "approved", "rejected", "refund_required"],
  payment_confirmed: ["approved", "compliance_hold", "refund_required"],
  compliance_hold: ["under_review", "approved", "rejected", "refund_required"],
  approved: ["processing", "cancelled", "refund_required"],
  processing: ["completed", "compliance_hold", "refund_required"],
  completed: [],
  cancelled: [],
  rejected: [],
  refund_required: ["cancelled", "completed"],
};

export function canTransition(from: OrderStatus, to: OrderStatus, liveTrading: boolean) {
  if (!allowedTransitions[from].includes(to)) return false;
  if (!liveTrading && (to === "processing" || to === "completed")) return false;
  return true;
}
