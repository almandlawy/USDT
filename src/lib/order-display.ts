import type { Locale } from "./constants";
import { systemStatusLabel } from "./status-labels";

export function orderStatusLabel(status: string, locale: Locale) {
  return systemStatusLabel(status, locale);
}

export function statusTone(status: string): "info" | "success" | "warning" | "danger" | "neutral" {
  if (["approved", "payment_confirmed", "completed"].includes(status)) return "success";
  if (["rejected", "cancelled", "refund_required", "expired"].includes(status)) return "danger";
  if (["compliance_hold", "awaiting_kyc", "awaiting_payment", "waiting_customer", "waiting_staff", "resubmission_required"].includes(status)) return "warning";
  if (status === "not_started" || status === "draft") return "neutral";
  return "info";
}
