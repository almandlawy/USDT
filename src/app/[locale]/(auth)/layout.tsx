import { Logo } from "@/components/ui/logo";
import { PrelaunchBanner } from "@/components/ui/prelaunch-banner";
import { isLocale } from "@/lib/i18n/dictionaries";
import { BadgeCheck, FileKey2, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function AuthLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const ar = raw === "ar";

  return (
    <div className="authPage">
      <PrelaunchBanner locale={raw} />
      <div className="authGrid">
        <aside className="authVisual">
          <Logo locale={raw} variant="dark" />
          <div className="authVisualCopy">
            <span className="authKicker">{ar ? "GULF GATE · وصول محمي" : "GULF GATE · SECURE ACCESS"}</span>
            <h1>{ar ? "مساحة واحدة للطلبات والدفع والمتابعة." : "One refined workspace for requests, payments and tracking."}</h1>
            <p>
              {ar
                ? "ادخل إلى بوابة تشغيل مصممة بوضوح: حالة الطلب، التحقق، الإثباتات، الدعم والتنبيهات في مكان واحد."
                : "Enter an operational gateway designed for clarity: request state, verification, proofs, support and notifications in one place."}
            </p>
          </div>
          <div className="authFeatureGrid">
            <article><ShieldCheck /><span><b>{ar ? "جلسات محمية" : "Protected sessions"}</b><small>{ar ? "حماية الدخول والحساب" : "Account and sign-in protection"}</small></span></article>
            <article><FileKey2 /><span><b>{ar ? "ملفات خاصة" : "Private files"}</b><small>{ar ? "وصول بحسب الصلاحية" : "Role-based access"}</small></span></article>
            <article><BadgeCheck /><span><b>{ar ? "مراجعة موثقة" : "Traceable review"}</b><small>{ar ? "سجل واضح لكل إجراء" : "A clear trail for every action"}</small></span></article>
          </div>
          <div className="authVisualSeal" aria-hidden="true"><span>GG</span></div>
        </aside>
        <main className="authMain">
          <div className="authMobileLogo"><Logo locale={raw} variant="light" /></div>
          {children}
        </main>
      </div>
    </div>
  );
}
