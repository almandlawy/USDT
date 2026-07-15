import { Logo } from "@/components/ui/logo";
import { PrelaunchBanner } from "@/components/ui/prelaunch-banner";
import { isLocale } from "@/lib/i18n/dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata:Metadata={robots:{index:false,follow:false,nocache:true}};

export default async function AuthLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params; if (!isLocale(raw)) notFound(); const ar = raw === "ar";
  return <div className="authPage"><PrelaunchBanner locale={raw}/><div className="authGrid"><aside className="authVisual"><Logo locale={raw}/><div><span className="authKicker">SECURE ACCESS / GULF GATE</span><h1>{ar ? "حساب واحد. مسار واضح. حماية متقدمة." : "One account. Clear workflows. Advanced protection."}</h1><p>{ar ? "إدارة الطلبات والتحقق والوثائق والدعم من مساحة آمنة واحدة." : "Manage requests, verification, documents and support from one secure workspace."}</p></div><ul><li>OTP VERIFIED</li><li>SECURE SESSIONS</li><li>OPTIONAL 2FA</li></ul></aside><main className="authMain"><div className="authMobileLogo"><Logo locale={raw}/></div>{children}</main></div></div>;
}
