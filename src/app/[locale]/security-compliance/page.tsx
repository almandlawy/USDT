import Link from "next/link";
import { notFound } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/header";
import { PrelaunchBanner } from "@/components/ui/prelaunch-banner";
import { Logo } from "@/components/ui/logo";
import { getDictionary, isLocale } from "@/lib/i18n/dictionaries";
import type { Metadata } from "next";
import { getSiteOrigin, seoCopy } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const ar = raw === "ar";
  const origin = getSiteOrigin();
  return {
    title: ar ? "الأمان والامتثال | Gulf Gate" : "Security & Compliance | Gulf Gate",
    description: ar
      ? "تفاصيل أمان Gulf Gate وإعدادات ما قبل الإطلاق وسياسات الوصول والملفات الخاصة."
      : "Gulf Gate security details, pre-launch controls, access policies and private storage practices.",
    alternates: {
      canonical: `${origin}/${raw}/security-compliance`,
      languages: { "ar-IQ": `${origin}/ar/security-compliance`, "en-IQ": `${origin}/en/security-compliance`, "x-default": `${origin}/ar/security-compliance` },
    },
  };
}

export default async function SecurityCompliancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const ar = locale === "ar";
  const dict = getDictionary(locale);

  return (
    <>
      <PrelaunchBanner locale={locale} />
      <MarketingHeader locale={locale} dict={dict} />
      <main className="shell sectionBlock securityCompliancePage">
        <div className="pageHeading">
          <div>
            <span>{ar ? "الأمان والامتثال" : "Security & compliance"}</span>
            <h1>{ar ? "ضوابط ما قبل الإطلاق" : "Pre-launch controls"}</h1>
            <p>{seoCopy[locale].description}</p>
          </div>
        </div>
        <section className="panel">
          <div className="panelHeading">
            <div>
              <span>{ar ? "للعملاء" : "For customers"}</span>
              <h2>{ar ? "ما الذي نحميه؟" : "What we protect"}</h2>
            </div>
            <ShieldCheck />
          </div>
          <ul className="checkList">
            <li className="done">{ar ? "الوصول حسب صلاحية الحساب فقط" : "Access limited by account permission"}</li>
            <li className="done">{ar ? "ملفات KYC وإثباتات الدفع في تخزين خاص" : "KYC and payment proofs in private storage"}</li>
            <li className="done">{ar ? "لا نخزن مفاتيح المحافظ أو عبارات الاستعادة" : "Wallet private keys and seed phrases are never stored"}</li>
            <li className="done">{ar ? "لا يتم تنفيذ مدفوعات أو تحويلات حقيقية في هذه المرحلة" : "No real payments or transfers are executed at this stage"}</li>
          </ul>
        </section>
        <section className="panel">
          <div className="panelHeading">
            <div>
              <span>{ar ? "للمشغلين" : "For operators"}</span>
              <h2>{ar ? "الضوابط التقنية" : "Technical controls"}</h2>
            </div>
            <LockKeyhole />
          </div>
          <p>
            {ar
              ? "للتفاصيل الداخلية: صلاحيات قواعد البيانات، المصادقة الإضافية للإدارة، سجلات التدقيق غير القابلة للتعديل، وتفعيل التنفيذ الحقيقي فقط بعد موافقة قانونية موثقة ومسؤول امتثال ومسؤول أعلى وجلسة 2FA قوية."
              : "Internal controls include database permissions, admin MFA elevation, immutable audit logs, and real execution activation only after documented legal approval, compliance sign-off, a senior admin and a strong 2FA session."}
          </p>
          <div className="headingActions" style={{ marginTop: 16 }}>
            <Link className="secondaryButton" href={`/${locale}/legal/privacy`}>{ar ? "سياسة الخصوصية" : "Privacy policy"}</Link>
            <Link className="primaryButton" href={`/${locale}/register`}>{ar ? "إنشاء حساب" : "Create account"}</Link>
          </div>
        </section>
      </main>
      <footer className="mainFooter">
        <div className="shell footerBottom">
          <Logo locale={locale} />
          <span>© 2026 Gulf Gate</span>
        </div>
      </footer>
    </>
  );
}
