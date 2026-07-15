import Link from "next/link";
import { headers } from "next/headers";
import { ArrowUpLeft, ArrowUpRight, BadgeCheck, Fingerprint, Gauge, Landmark, LockKeyhole, ScanLine, ShieldCheck, Workflow, Zap, CircleCheck } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/header";
import { Logo } from "@/components/ui/logo";
import { PrelaunchBanner } from "@/components/ui/prelaunch-banner";
import { StatusBadge } from "@/components/ui/status-badge";
import { getDictionary, isLocale } from "@/lib/i18n/dictionaries";
import { notFound } from "next/navigation";
import { getMarketSnapshot } from "@/lib/market-data";
import { MarketTicker } from "@/components/marketing/market-ticker";
import { ExchangeDesk } from "@/components/marketing/exchange-desk";
import { ClayAccountIcon, ClayRequestIcon, ClayVerifyIcon } from "@/components/marketing/clay-icons";
import { SeoJsonLd } from "@/components/marketing/seo-json-ld";

export default async function MarketingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const dict = getDictionary(locale);
  const ar = locale === "ar";
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;
  const market = await getMarketSnapshot();
  const nonce = (await headers()).get("x-nonce") || undefined;
  const usdt = market.assets.find((asset) => asset.symbol === "USDT") || market.assets[0];
  const features = ar
    ? [
        [Fingerprint, "هوية موثقة", "تسجيل آمن برابط البريد، 2FA، ومسار KYC للأفراد والشركات."],
        [Workflow, "طلبات واضحة", "شراء وبيع وP2P مع مرجع موحد وحالة زمنية كاملة."],
        [ScanLine, "إثباتات خاصة", "ملفات مشفرة، روابط مؤقتة، ومراجعة قابلة لإعادة التقديم."],
        [ShieldCheck, "امتثال مدمج", "ضوابط صلاحيات، تنبيهات مخاطر، وسجل تدقيق غير قابل للتعديل."],
      ]
    : [
        [Fingerprint, "Verified identity", "Secure email-link registration, 2FA and KYC workflows for people and businesses."],
        [Workflow, "Structured requests", "Buy, sell and P2P requests with unified references and complete timelines."],
        [ScanLine, "Private evidence", "Encrypted files, temporary links and review with resubmission support."],
        [ShieldCheck, "Built-in compliance", "Least privilege, risk alerts and an immutable audit trail."],
      ];
  const steps = ar
    ? [
        [ClayAccountIcon, "01", "أنشئ حساباً", "سجّل بالبريد وابدأ ملفك خلال دقائق."],
        [ClayVerifyIcon, "02", "أكمل التحقق", "KYC مرة واحدة للأفراد أو الشركات مع وثائق خاصة."],
        [ClayRequestIcon, "03", "أرسل طلباً للمراجعة", "شراء أو بيع USDT بمسار واضح دون تنفيذ مالي حقيقي."],
      ]
    : [
        [ClayAccountIcon, "01", "Create an account", "Register with email and start your profile in minutes."],
        [ClayVerifyIcon, "02", "Verify once", "Complete individual or business KYC with private documents."],
        [ClayRequestIcon, "03", "Submit for review", "Buy or sell USDT through a clear flow with no real execution yet."],
      ];

  return (
    <>
      <SeoJsonLd locale={locale} nonce={nonce} />
      <a className="skipLink" href="#main-content">
        {ar ? "انتقل إلى المحتوى" : "Skip to content"}
      </a>
      <PrelaunchBanner locale={locale} />
      <MarketingHeader locale={locale} dict={dict} />
      <MarketTicker locale={locale} initial={market} />
      <main id="main-content">
        <section className="heroSection">
          <div className="orb mintOrb" />
          <div className="orb goldOrb" />
          <div className="shell heroGrid">
            <div className="heroCopy">
              <p className="heroBrand" aria-label="Gulf Gate">
                <Logo locale={locale} />
              </p>
              <StatusBadge tone="warning">{dict.hero.badge}</StatusBadge>
              <h1>
                {dict.hero.titleA}
                <span>{dict.hero.titleB}</span>
              </h1>
              <p>{dict.hero.text}</p>
              <div className="heroActions">
                <Link className="primaryButton" href={`/${locale}/register`}>
                  {dict.hero.primary}
                  <Arrow size={18} />
                </Link>
                <a className="secondaryButton" href="#how-it-works">
                  <ShieldCheck size={18} />
                  {dict.hero.secondary}
                </a>
              </div>
              <div className="trustRow">
                <span>
                  <CircleCheck /> {ar ? "لا تنفيذ مالي حقيقي" : "No real financial execution"}
                </span>
                <span>
                  <CircleCheck /> {ar ? "KYC وتخزين خاص" : "KYC & private storage"}
                </span>
                <span>
                  <CircleCheck /> {ar ? "مراجعة بشرية + تدقيق" : "Human review + audit"}
                </span>
              </div>
              <div className="assetRow" aria-label={ar ? "الأصول المدعومة" : "Supported assets"}>
                <span>
                  <i className="assetUsdt" /> USDT
                </span>
                <span>
                  <i className="assetBtc" /> BTC
                </span>
                <span>
                  <i className="assetEth" /> ETH
                </span>
                <span>
                  <i className="assetUsdc" /> USDC
                </span>
              </div>
            </div>
            <ExchangeDesk
              locale={locale}
              registerHref={`/${locale}/register`}
              rates={{
                usdtUsd: usdt.usd,
                usdtAed: usdt.aed || usdt.usd * 3.6725,
                usdtIqd: usdt.iqd > 0 ? usdt.iqd : 1310,
                stale: market.stale || usdt.iqd <= 0,
              }}
            />
          </div>
        </section>

        <section id="how-it-works" className="sectionBlock stepsSection">
          <div className="shell">
            <div className="sectionTitle centered">
              <span>{ar ? "كيف تبدأ" : "HOW IT WORKS"}</span>
              <h2>{ar ? "ثلاث خطوات مرتبة وواضحة" : "Three tidy, clear steps"}</h2>
              <p>
                {ar
                  ? "نفس الإحساس المنظّم لمنصة موثوقة — مع إبقاء التنفيذ مقفولاً قبل الإطلاق."
                  : "The same organised desk feeling — while execution stays locked before launch."}
              </p>
            </div>
            <div className="stepsGrid">
              {steps.map(([Icon, n, title, text]) => {
                const StepIcon = Icon as typeof ClayAccountIcon;
                return (
                  <article className="stepCard" key={String(n)}>
                    <StepIcon label={String(title)} />
                    <span>{String(n)}</span>
                    <h3>{String(title)}</h3>
                    <p>{String(text)}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="platform" className="sectionBlock">
          <div className="shell">
            <div className="sectionTitle">
              <span>01 / PLATFORM</span>
              <h2>{ar ? "نظام عمليات مالي، وليس مجرد واجهة" : "A financial operations system, not just an interface"}</h2>
              <p>{ar ? "كل خطوة مصممة لتكون قابلة للتحقق والمراجعة والتدقيق." : "Every step is designed to be verifiable, reviewable and auditable."}</p>
            </div>
            <div className="featureGrid">
              {features.map(([Icon, title, text], index) => {
                const FeatureIcon = Icon as typeof Fingerprint;
                return (
                  <article className="featureCard" key={String(title)}>
                    <div className="featureIcon">
                      <FeatureIcon />
                    </div>
                    <span>0{index + 1}</span>
                    <h3>{String(title)}</h3>
                    <p>{String(text)}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="security" className="sectionBlock darkPanel">
          <div className="shell securityGrid">
            <div>
              <span className="sectionKicker">02 / SECURITY</span>
              <h2>{ar ? "الأمان جزء من المعمارية" : "Security is part of the architecture"}</h2>
              <p>
                {ar
                  ? "البيانات الحساسة لا تُرسل إلى الواجهة، والملفات تبقى خاصة، وكل صلاحية محدودة بالدور."
                  : "Sensitive data stays off the frontend, files remain private, and every permission is constrained by role."}
              </p>
              <Link className="secondaryButton inverted" href={`/${locale}/register`}>
                {ar ? "استكشف الحساب" : "Explore account"}
                <Arrow />
              </Link>
            </div>
            <div className="securityStack">
              {[
                [LockKeyhole, ar ? "جلسات آمنة و2FA" : "Secure sessions & 2FA", "AAL2"],
                [Landmark, ar ? "تخزين خاص وروابط مؤقتة" : "Private storage & signed links", "60 SEC"],
                [Gauge, ar ? "تحديد معدلات الطلب" : "Database-backed rate limits", "ENFORCED"],
                [BadgeCheck, ar ? "سجل غير قابل للتعديل" : "Immutable audit log", "APPEND ONLY"],
              ].map(([Icon, title, tag]) => {
                const SecurityIcon = Icon as typeof LockKeyhole;
                return (
                  <div key={String(title)}>
                    <SecurityIcon />
                    <span>
                      <b>{String(title)}</b>
                      <small>{ar ? "ضبط قابل للإثبات والمراجعة" : "Provable, reviewable control"}</small>
                    </span>
                    <em>{String(tag)}</em>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="compliance" className="sectionBlock">
          <div className="shell">
            <div className="sectionTitle centered">
              <span>03 / CONTROL</span>
              <h2>{ar ? "التنفيذ الحقيقي يحتاج أربع بوابات" : "Real execution requires four gates"}</h2>
            </div>
            <div className="gateGrid">
              {[
                ["01", ar ? "موافقة قانونية" : "Legal approval"],
                ["02", ar ? "مسؤول امتثال" : "Compliance sign-off"],
                ["03", ar ? "Super Admin + 2FA" : "Super Admin + 2FA"],
                ["04", ar ? "تفعيل قاعدة البيانات" : "Database activation"],
              ].map(([n, t], i) => (
                <div key={n} className={i === 3 ? "gate lockedGate" : "gate"}>
                  <span>{n}</span>
                  <div>
                    {i === 3 ? <LockKeyhole /> : <Zap />}
                    <h3>{t}</h3>
                    <p>{ar ? "لا يمكن تجاوز هذه البوابة من الواجهة." : "This gate cannot be bypassed from the frontend."}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="sectionBlock faqSection">
          <div className="shell faqGrid">
            <div className="sectionTitle">
              <span>04 / FAQ</span>
              <h2>{ar ? "أسئلة مهمة" : "Important questions"}</h2>
            </div>
            <div className="faqList">
              <details open>
                <summary>{ar ? "هل Gulf Gate مرخصة؟" : "Is Gulf Gate licensed?"}</summary>
                <p>
                  {ar
                    ? "لا تدّعي Gulf Gate امتلاك ترخيص لخدمات الأصول الافتراضية حالياً. تبقى الخدمة في وضع ما قبل الإطلاق."
                    : "Gulf Gate does not claim to hold a virtual asset services licence. The service remains in pre-launch mode."}
                </p>
              </details>
              <details>
                <summary>{ar ? "هل يمكن تنفيذ طلب حقيقي؟" : "Can a real request be executed?"}</summary>
                <p>
                  {ar
                    ? "لا. يمكن بناء الطلب ومراجعته فقط، بينما الإيداع والدفع والتحويل وإطلاق الأصل مقفول."
                    : "No. Requests can be prepared and reviewed, while deposits, payouts, transfers and asset release remain locked."}
                </p>
              </details>
              <details>
                <summary>{ar ? "كيف تُحفظ الوثائق؟" : "How are documents stored?"}</summary>
                <p>{ar ? "في حاويات خاصة مع سياسات RLS وروابط وصول مؤقتة موقعة." : "In private buckets protected by RLS and short-lived signed access links."}</p>
              </details>
            </div>
          </div>
        </section>
      </main>
      <footer className="mainFooter">
        <div className="shell footerGrid">
          <div>
            <Logo locale={locale} />
            <p>{ar ? "منصة إدارة طلبات أصول رقمية قيد التجهيز." : "A digital-asset request management platform in development."}</p>
          </div>
          <div>
            <h3>{ar ? "قانوني" : "Legal"}</h3>
            <Link href={`/${locale}/legal/risk`}>{ar ? "إفصاح المخاطر" : "Risk disclosure"}</Link>
            <Link href={`/${locale}/legal/privacy`}>{ar ? "الخصوصية" : "Privacy"}</Link>
            <Link href={`/${locale}/legal/terms`}>{ar ? "شروط الاستخدام" : "Terms"}</Link>
          </div>
          <div className="footerLock">
            <LockKeyhole />
            <span>
              <b>{ar ? "وضع ما قبل الإطلاق" : "Pre-launch mode"}</b>
              <small>{ar ? "لا معاملات مالية حقيقية" : "No real financial transactions"}</small>
            </span>
          </div>
        </div>
        <div className="shell footerBottom">
          <span>© 2026 Gulf Gate</span>
          <span>{ar ? "معلومات عامة فقط — ليست عرضاً أو توصية" : "General information only — not an offer or recommendation"}</span>
        </div>
      </footer>
    </>
  );
}
