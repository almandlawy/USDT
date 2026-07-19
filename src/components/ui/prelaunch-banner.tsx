import { CheckCircle2, ShieldAlert } from "lucide-react";
import type { Locale } from "@/lib/constants";
import { PRELAUNCH_NOTICE } from "@/lib/constants";

function enabled(value: string | undefined) {
  return ["1", "true", "enabled", "yes"].includes((value || "").trim().toLowerCase());
}

export function PrelaunchBanner({ locale }: { locale: Locale }) {
  const realPayments = enabled(process.env.REAL_PAYMENTS_ENABLED);
  const Icon = realPayments ? CheckCircle2 : ShieldAlert;
  const message = realPayments
    ? locale === "ar"
      ? "استقبال طلبات الدفع مفعّل وفق الوسائل المضبوطة — التسليم يبقى خاضعاً للمراجعة البشرية."
      : "Payment requests are enabled for configured routes — fulfillment remains subject to human review."
    : PRELAUNCH_NOTICE[locale];

  return (
    <div className={`prelaunchBanner${realPayments ? " operational" : ""}`} role="status">
      <Icon size={16} />
      <span>{message}</span>
      <strong>{realPayments ? (locale === "ar" ? "تشغيل مضبوط" : "Controlled operation") : locale === "ar" ? "وضع التجهيز" : "Pre-launch"}</strong>
    </div>
  );
}
