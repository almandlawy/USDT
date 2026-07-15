import { ShieldAlert } from "lucide-react";
import type { Locale } from "@/lib/constants";
import { PRELAUNCH_NOTICE } from "@/lib/constants";

export function PrelaunchBanner({ locale }: { locale: Locale }) {
  return (
    <div className="prelaunchBanner" role="status">
      <ShieldAlert size={16} />
      <span>{PRELAUNCH_NOTICE[locale]}</span>
      <strong>{locale === "ar" ? "وضع التجهيز" : "Pre-launch"}</strong>
    </div>
  );
}
