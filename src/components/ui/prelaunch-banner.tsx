import { ShieldAlert } from "lucide-react";
import { PRELAUNCH_NOTICE, type Locale } from "@/lib/constants";

export function PrelaunchBanner({ locale }: { locale: Locale }) {
  return <div className="prelaunchBanner" role="status"><ShieldAlert size={16}/><span>{PRELAUNCH_NOTICE[locale]}</span><strong>LIVE_TRADING=false</strong></div>;
}
