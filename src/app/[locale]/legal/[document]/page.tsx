import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { PrelaunchBanner } from "@/components/ui/prelaunch-banner";
import { isLocale } from "@/lib/i18n/dictionaries";
import type { Metadata } from "next";
import { getSiteOrigin, seoCopy } from "@/lib/site";

const LEGAL_REVIEW = "LEGAL REVIEW REQUIRED BEFORE PUBLIC LAUNCH";

type Doc = { title: string; body: string[] };

const docs = ["terms", "privacy", "risk", "cookies", "retention", "aup", "complaints", "data-deletion"] as const;
type DocKey = (typeof docs)[number];

const content: Record<DocKey, { ar: Doc; en: Doc }> = {
  terms: {
    ar: {
      title: "شروط الاستخدام",
      body: [
        "Gulf Gate منصة لإدارة طلبات الأصول الرقمية في وضع ما قبل الإطلاق. لا يتم قبول ودائع، ولا دفع أموال، ولا تنفيذ تداول، ولا تحويل، ولا إطلاق USDT، ولا Custody.",
        "يجوز للمستخدم إنشاء حساب وإكمال ملف KYC وإنشاء طلب تجريبي ومتابعة حالته والتواصل مع الدعم. الأسعار استرشادية وليست عرضاً ملزماً.",
        "يجب تقديم بيانات صحيحة. يُحظر إساءة الاستخدام أو إنشاء حسابات وهمية أو محاولة تجاوز الضوابط الأمنية.",
        "القانون والاختصاص القضائي: Placeholder — يُحدَّد بعد المراجعة القانونية. " + LEGAL_REVIEW,
      ],
    },
    en: {
      title: "Terms of use",
      body: [
        "Gulf Gate is a digital-asset request-management platform in pre-launch. It does not accept deposits, pay out funds, execute trades, transfer assets, release USDT, or provide custody.",
        "Users may create an account, complete KYC, create demo requests, track status, and contact support. Prices are indicative and not binding offers.",
        "Information must be accurate. Abuse, fake accounts, or attempts to bypass security controls are prohibited.",
        "Governing law and venue: Placeholder — to be set after legal review. " + LEGAL_REVIEW,
      ],
    },
  },
  privacy: {
    ar: {
      title: "سياسة الخصوصية",
      body: [
        "نجمع بيانات الحساب وKYC وملفات الدعم وبيانات الأمان اللازمة لحماية الحساب (مثل بصمات دخول مُجزَّأة بالتشفير وليس كنص خام).",
        "وثائق KYC والإثباتات التجريبية تُحفظ في تخزين خاص مع وصول محدود حسب الصلاحية وروابط مؤقتة عند العرض.",
        "لا نخزّن مفاتيح المحافظ أو عبارات الاسترداد. لا ننفّذ معاملات مالية حقيقية في مرحلة التجهيز.",
        "قد نستخدم مزودي بنية تحتية (استضافة، مصادقة، بريد). نقل البيانات عبر الحدود يخضع للسياسة القانونية المعتمدة.",
        "حقوقك تشمل الاطلاع والتصحيح وطلب الحذف وفق سياسة الاحتفاظ والشكاوى. " + LEGAL_REVIEW,
      ],
    },
    en: {
      title: "Privacy policy",
      body: [
        "We process account, KYC, support, and security telemetry needed to protect accounts (for example hashed login fingerprints — not raw IP/User-Agent stored as plaintext).",
        "KYC documents and demo evidence are kept in private storage with role-limited access and short-lived viewing links.",
        "We do not store wallet private keys or seed phrases. We do not execute real financial transactions in pre-launch.",
        "Infrastructure providers (hosting, authentication, email) may process data. Cross-border transfers follow the approved legal policy.",
        "Your rights include access, correction, and deletion requests under the retention and complaints policies. " + LEGAL_REVIEW,
      ],
    },
  },
  risk: {
    ar: {
      title: "إفصاح المخاطر",
      body: [
        "لا تدّعي Gulf Gate امتلاك ترخيص لخدمات الأصول الافتراضية حالياً. لا يوجد ضمان للتنفيذ أو السعر أو الزمن.",
        "أسعار السوق استرشادية وقد تكون مشتقة من سعر صرف. عند تعطل المزود قد تظهر بعض الأصول غير متاحة.",
        "لا تُرسل أموالاً حقيقية ولا ترفع إثبات تحويل حقيقي أثناء المرحلة التجريبية.",
        "العملات الرقمية عالية التقلب والمخاطر. " + LEGAL_REVIEW,
      ],
    },
    en: {
      title: "Risk disclosure",
      body: [
        "Gulf Gate does not currently claim a virtual-asset services licence. There is no guarantee of execution, price, or timing.",
        "Market prices are indicative and may use derived FX. When the provider is down, some assets may show as unavailable.",
        "Do not send real funds and do not upload real payment proofs during the experimental phase.",
        "Digital assets are highly volatile and risky. " + LEGAL_REVIEW,
      ],
    },
  },
  cookies: {
    ar: {
      title: "سياسة ملفات الارتباط",
      body: [
        "نستخدم ملفات ارتباط ضرورية لجلسة تسجيل الدخول والحماية والأمان.",
        "لا نستخدم إعلانات طرف ثالث في وضع ما قبل الإطلاق.",
        "يمكنك التحكم بملفات الارتباط من إعدادات المتصفح، مع العلم أن تعطيل ملفات الجلسة يمنع الدخول.",
      ],
    },
    en: {
      title: "Cookie policy",
      body: [
        "We use necessary cookies for sign-in sessions and security.",
        "We do not use third-party advertising cookies in pre-launch.",
        "You can control cookies in your browser; disabling session cookies will prevent sign-in.",
      ],
    },
  },
  retention: {
    ar: {
      title: "سياسة الاحتفاظ بالبيانات",
      body: [
        "بيانات الحساب وKYC وسجلات التدقيق تُحفظ للمدة التي تتطلبها المراجعة القانونية والامتثال قبل الإطلاق.",
        "أحداث الدخول الأمنية تُراجع دورياً وقد تُحذف بعد حوالي 90 يوماً عبر إجراء إداري مضبوط.",
        "طلب الحذف لا يلغي الالتزامات القانونية بالاحتفاظ عند وجودها. " + LEGAL_REVIEW,
      ],
    },
    en: {
      title: "Data retention policy",
      body: [
        "Account, KYC, and audit records are retained for the period required by legal and compliance review before launch.",
        "Security login events are reviewed periodically and may be purged after about 90 days through a controlled admin procedure.",
        "A deletion request does not override mandatory legal retention where applicable. " + LEGAL_REVIEW,
      ],
    },
  },
  aup: {
    ar: {
      title: "سياسة الاستخدام المقبول",
      body: [
        "يُحظر استخدام المنصة لأنشطة غير قانونية أو احتيال أو غسل أموال أو انتحال هوية أو إساءة للأنظمة.",
        "يُحظر رفع ملفات خبيثة أو محاولة الوصول إلى بيانات مستخدمين آخرين.",
        "نحتفظ بحق تعليق الحسابات المخالِفة بعد مراجعة بشرية.",
      ],
    },
    en: {
      title: "Acceptable use policy",
      body: [
        "The platform must not be used for illegal activity, fraud, money laundering, impersonation, or system abuse.",
        "Uploading malware or attempting to access other users’ data is prohibited.",
        "We may suspend violating accounts after human review.",
      ],
    },
  },
  complaints: {
    ar: {
      title: "إجراءات الشكاوى",
      body: [
        "يمكنك فتح تذكرة دعم من لوحة العميل لشرح الشكوى بوضوح مع رقم المرجع إن وجد.",
        "فريق الدعم يراجع الطلب ويسجّل النتيجة. الشكاوى المتعلقة بالامتثال تُحوَّل للمراجعة البشرية.",
        "بيانات التواصل تظهر فقط عند ضبطها في إعدادات البيئة — لا تُختلق هنا.",
      ],
    },
    en: {
      title: "Complaints procedure",
      body: [
        "Open a support ticket from the client dashboard and describe the complaint clearly with any reference number.",
        "Support reviews the case and records the outcome. Compliance-related complaints are escalated for human review.",
        "Contact details appear only when configured in environment settings — they are not invented here.",
      ],
    },
  },
  "data-deletion": {
    ar: {
      title: "طلب حذف الحساب والبيانات",
      body: [
        "لطلب حذف الحساب أو تصدير البيانات، افتح تذكرة دعم من فئة الأمان أو راسل بريد الخصوصية عند توفره.",
        "قد نحتفظ بسجلات قانونية أو تدقيق لا يمكن حذفها فوراً وفق سياسة الاحتفاظ.",
        "لا يتم حذف البيانات تلقائياً من الواجهة إذا كانت هناك التزامات احتفاظ. " + LEGAL_REVIEW,
      ],
    },
    en: {
      title: "Account and data deletion request",
      body: [
        "To request account deletion or a data export, open a security support ticket or email the privacy address when configured.",
        "Legal or audit records may be retained under the retention policy and cannot always be deleted immediately.",
        "Data is not hard-deleted from the UI when retention obligations apply. " + LEGAL_REVIEW,
      ],
    },
  },
};

export function generateStaticParams() {
  return ["ar", "en"].flatMap((locale) => docs.map((document) => ({ locale, document })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; document: string }> }): Promise<Metadata> {
  const { locale: raw, document } = await params;
  if (!isLocale(raw) || !(docs as readonly string[]).includes(document)) return { robots: { index: false } };
  const locale = raw;
  const origin = getSiteOrigin();
  const page = content[document as DocKey][locale];
  const suffix = `/legal/${document}`;
  return {
    title: page.title,
    description: seoCopy[locale].legalDescription,
    alternates: {
      canonical: `${origin}/${locale}${suffix}`,
      languages: {
        "ar-IQ": `${origin}/ar${suffix}`,
        "en-IQ": `${origin}/en${suffix}`,
        "x-default": `${origin}/ar${suffix}`,
      },
    },
    openGraph: {
      title: `${page.title} | Gulf Gate`,
      description: seoCopy[locale].legalDescription,
      url: `${origin}/${locale}${suffix}`,
      type: "article",
      locale: locale === "ar" ? "ar_IQ" : "en_IQ",
    },
  };
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string; document: string }> }) {
  const { locale: raw, document } = await params;
  if (!isLocale(raw) || !(docs as readonly string[]).includes(document)) notFound();
  const locale = raw;
  const ar = locale === "ar";
  const page = content[document as DocKey][locale];
  const Arrow = ar ? ArrowRight : ArrowLeft;
  return (
    <div className="legalPage">
      <PrelaunchBanner locale={locale} />
      <header className="legalHeader shell">
        <Logo locale={locale} />
        <Link className="secondaryButton" href={`/${locale}`}><Arrow />{ar ? "العودة للرئيسية" : "Back home"}</Link>
      </header>
      <main className="legalDocument shell">
        <span>{ar ? "قانوني / إصدار 2026-07-16" : "Legal / version 2026-07-16"}</span>
        <h1>{page.title}</h1>
        <div className="legalLock">
          <LockKeyhole />
          <p>
            {ar
              ? "إفصاح ما قبل الإطلاق — لا يمثل ادعاءً بالترخيص. يلزم مراجعة قانونية قبل الإطلاق العام."
              : "Pre-launch disclosure — not a licensing claim. Legal review is required before public launch."}
          </p>
        </div>
        {page.body.map((paragraph) => <p key={paragraph.slice(0, 48)}>{paragraph}</p>)}
        <nav className="legalNav" aria-label={ar ? "مستندات قانونية أخرى" : "Other legal documents"}>
          {docs.map((slug) => (
            <Link key={slug} href={`/${locale}/legal/${slug}`}>{content[slug][locale].title}</Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
