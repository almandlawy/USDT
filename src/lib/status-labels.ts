import type { Locale } from "@/lib/constants";

type Bilingual = { ar: string; en: string };

const SYSTEM_STATUS: Record<string, Bilingual> = {
  not_started: { ar: "لم يبدأ", en: "Not started" },
  draft: { ar: "مسودة", en: "Draft" },
  pending: { ar: "قيد الانتظار", en: "Pending" },
  submitted: { ar: "تم الإرسال", en: "Submitted" },
  under_review: { ar: "قيد المراجعة", en: "Under review" },
  approved: { ar: "مقبول", en: "Approved" },
  rejected: { ar: "مرفوض", en: "Rejected" },
  completed: { ar: "مكتمل", en: "Completed" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
  waiting_customer: { ar: "بانتظار العميل", en: "Waiting on customer" },
  waiting_staff: { ar: "بانتظار الدعم", en: "Waiting on support" },
  open: { ar: "مفتوحة", en: "Open" },
  closed: { ar: "مغلقة", en: "Closed" },
  uploaded: { ar: "تم الرفع", en: "Uploaded" },
  accepted: { ar: "مقبول", en: "Accepted" },
  resubmission_required: { ar: "يلزم إعادة التقديم", en: "Resubmission required" },
  expired: { ar: "منتهي", en: "Expired" },
  payment_received_pending_review: { ar: "دفعت بانتظار المراجعة", en: "Payment received — pending review" },
  quote_created: { ar: "تم إنشاء العرض", en: "Quote created" },
  awaiting_customer: { ar: "بانتظار العميل", en: "Awaiting customer" },
  kyc_required: { ar: "يلزم KYC", en: "KYC required" },
  compliance_review: { ar: "مراجعة امتثال", en: "Compliance review" },
  approved_for_fulfillment: { ar: "معتمد للتسليم", en: "Approved for fulfillment" },
  fulfillment_in_progress: { ar: "التسليم قيد التنفيذ", en: "Fulfillment in progress" },
  fulfilled: { ar: "تم التسليم", en: "Fulfilled" },
  refunded: { ar: "مسترد", en: "Refunded" },
  awaiting_kyc: { ar: "بانتظار التحقق", en: "Awaiting KYC" },
  awaiting_payment: { ar: "بانتظار الدفع", en: "Awaiting payment" },
  proof_uploaded: { ar: "تم رفع الإثبات", en: "Proof uploaded" },
  payment_confirmed: { ar: "الدفع مؤكد — بانتظار المراجعة", en: "Payment confirmed — pending review" },
  compliance_hold: { ar: "تعليق امتثال", en: "Compliance hold" },
  processing: { ar: "معالجة مقفولة", en: "Processing locked" },
  refund_required: { ar: "يتطلب مراجعة استرداد", en: "Refund review required" },
  resolved: { ar: "تم الحل", en: "Resolved" },
  payment_pending: { ar: "بانتظار الدفع", en: "Payment pending" },
  disputed: { ar: "قيد النزاع", en: "Disputed" },
  released: { ar: "الإطلاق مقفول", en: "Release locked" },
  investigating: { ar: "قيد التحقيق", en: "Investigating" },
  awaiting_buyer: { ar: "بانتظار المشتري", en: "Awaiting buyer" },
  awaiting_seller: { ar: "بانتظار البائع", en: "Awaiting seller" },
  resolved_buyer: { ar: "حُل لصالح المشتري", en: "Resolved for buyer" },
  resolved_seller: { ar: "حُل لصالح البائع", en: "Resolved for seller" },
  quoted: { ar: "عرض سعري", en: "Quoted" },
  requested: { ar: "مطلوب", en: "Requested" },
  open_case: { ar: "مفتوح", en: "Open" },
};

const ORDER_TYPES: Record<string, Bilingual> = {
  buy: { ar: "شراء", en: "Buy" },
  sell: { ar: "بيع", en: "Sell" },
  p2p: { ar: "P2P", en: "P2P" },
};

export function systemStatusLabel(status: string | null | undefined, locale: Locale): string {
  if (!status) return SYSTEM_STATUS.not_started[locale];
  return SYSTEM_STATUS[status]?.[locale] || status.replaceAll("_", " ");
}

export function orderTypeLabel(type: string, locale: Locale): string {
  return ORDER_TYPES[type]?.[locale] || type;
}

export function formatFiatAmount(amount: number, currency: string, locale: Locale): string {
  const formatted = Number(amount).toLocaleString(locale === "ar" ? "ar-IQ" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}

export function formatOrderDate(value: string, locale: Locale): string {
  return new Date(value).toLocaleString(locale === "ar" ? "ar-IQ" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
