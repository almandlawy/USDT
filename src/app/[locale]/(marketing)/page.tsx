import Link from "next/link";
import { headers } from "next/headers";
import {
  ArrowUpLeft, ArrowUpRight, BadgeCheck, Building2, CircleCheck, CreditCard, Handshake,
  LifeBuoy, LockKeyhole, Mail, Network, Phone, ShieldCheck, WalletCards, Workflow,
} from "lucide-react";
import { notFound } from "next/navigation";
import { MarketingHeader } from "@/components/marketing/header";
import { ExchangeDesk } from "@/components/marketing/exchange-desk";
import { MarketTicker } from "@/components/marketing/market-ticker";
import { SeoJsonLd } from "@/components/marketing/seo-json-ld";
import { ClayAccountIcon, ClayRequestIcon, ClayVerifyIcon } from "@/components/marketing/clay-icons";
import { Logo } from "@/components/ui/logo";
import { PrelaunchBanner } from "@/components/ui/prelaunch-banner";
import { StatusBadge } from "@/components/ui/status-badge";
import { getDictionary, isLocale } from "@/lib/i18n/dictionaries";
import { getMarketSnapshot } from "@/lib/market-data";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

function contactValue(key: string) {
  const value = process.env[key]?.trim();
  return value || null;
}

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

  let paymentMethods: { name: string; code: string }[] = [];
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payment_methods")
      .select("code,name_ar,name_en")
      .eq("active", true)
      .order("sort_order");
    if (!error && data?.length) {
      paymentMethods = data.map((row) => ({ code: row.code, name: ar ? row.name_ar : row.name_en }));
    }
  }
  if (!paymentMethods.length) {
    paymentMethods = [
      { code: "fib", name: "FIB" },
      { code: "superqi", name: "SuperQi" },
      { code: "zain_cash", name: "Zain Cash" },
      { code: "bank_transfer", name: ar ? "تحويل بنكي" : "Bank Transfer" },
      { code: "cash_representative", name: ar ? "مندوب نقدي" : "Cash Representative" },
      { code: "wallet_transfer", name: ar ? "تحويل محفظة" : "Wallet Transfer" },
    ];
  }

  const company = contactValue("NEXT_PUBLIC_COMPANY_NAME");
  const supportEmail = contactValue("NEXT_PUBLIC_SUPPORT_EMAIL");
  const whatsapp = contactValue("NEXT_PUBLIC_WHATSAPP_NUMBER");
  const address = contactValue("NEXT_PUBLIC_COMPANY_ADDRESS");
  const hours = contactValue("NEXT_PUBLIC_WORKING_HOURS");
  const license = contactValue("NEXT_PUBLIC_TRADE_LICENSE_NUMBER");

  const steps = ar
    ? [
        [ClayAccountIcon, "01", "أنشئ حساباً", "سجّل ببريدك وكلمة مرور قوية وابدأ ملفك."],
        [ClayVerifyIcon, "02", "أكمل بياناتك وKYC", "ارفع الوثائق المطلوبة مرة واحدة للأفراد أو الشركات."],
        [ClayRequestIcon, "03", "أنشئ طلباً وتابعه", "أرسل طلب شراء أو بيع وراقب المراجعة والإشعارات."],
      ]
    : [
        [ClayAccountIcon, "01", "Create an account", "Register with email and a strong password to start your profile."],
        [ClayVerifyIcon, "02", "Complete profile & KYC", "Upload required documents once for individuals or businesses."],
        [ClayRequestIcon, "03", "Submit and track", "Create a buy or sell request and follow review + notifications."],
      ];

  const services = ar
    ? [
        [WalletCards, "شراء USDT", "أنشئ طلب شراء للمراجعة الإدارية دون تنفيذ مالي حالياً."],
        [CreditCard, "بيع USDT", "قدّم طلب بيع واضح مع الشبكة والغرض والمتابعة."],
        [Handshake, "P2P مُدار", "حالات P2P بإشراف بشري دون إطلاق تلقائي."],
        [BadgeCheck, "التحقق KYC", "مسار وثائق خاص ومراجعة منظمة."],
        [Building2, "إثباتات الدفع", "رفع خاص وربط بالطلب ومراجعة واضحة."],
        [LifeBuoy, "الدعم", "تذاكر موثقة ومتابعة الحالة."],
      ]
    : [
        [WalletCards, "Buy USDT", "Create a buy request for administrative review with no financial execution yet."],
        [CreditCard, "Sell USDT", "Submit a clear sell request with network, purpose and tracking."],
        [Handshake, "Managed P2P", "Human-supervised P2P cases with no automatic release."],
        [BadgeCheck, "KYC verification", "Private document flow with organised review."],
        [Building2, "Payment proofs", "Private uploads linked to requests with clear review."],
        [LifeBuoy, "Support", "Documented tickets and status tracking."],
      ];

  return (
    <>
      <SeoJsonLd locale={locale} nonce={nonce} />
      <a className="skipLink" href="#main-content">{ar ? "انتقل إلى المحتوى" : "Skip to content"}</a>
      <PrelaunchBanner locale={locale} />
      <MarketingHeader locale={locale} dict={dict} />
      <MarketTicker locale={locale} initial={market} />
      <main id="main-content">
        <section className="heroSection">
          <div className="orb mintOrb" />
          <div className="orb goldOrb" />
          <div className="shell heroGrid">
            <div className="heroCopy">
              <p className="heroBrand" aria-label="Gulf Gate"><Logo locale={locale} /></p>
              <StatusBadge tone="warning">{dict.hero.badge}</StatusBadge>
              <h1>
                {dict.hero.titleA}
                <span>{dict.hero.titleB}</span>
              </h1>
              <p>{dict.hero.text}</p>
              <div className="heroActions">
                <Link className="primaryButton" href={`/${locale}/register`}>{dict.hero.primary}<Arrow size={18} /></Link>
                <Link className="secondaryButton" href={`/${locale}/login`}>{dict.nav.login}</Link>
                <a className="textButton" href="#how-it-works">{dict.hero.secondary}</a>
              </div>
              <div className="trustRow">
                <span><CircleCheck />{ar ? "المنصة قيد التجهيز" : "Platform being prepared"}</span>
                <span><CircleCheck />{ar ? "لن يُطلب إرسال أموال الآن" : "No funds requested now"}</span>
                <span><CircleCheck />{ar ? "مستنداتك محفوظة بشكل خاص" : "Your documents stay private"}</span>
              </div>
            </div>
            <ExchangeDesk
              locale={locale}
              registerHref={`/${locale}/register`}
              rates={{
                usdtUsd: usdt.usd,
                usdtAed: usdt.aed > 0 ? usdt.aed : usdt.usd * 3.6725,
                usdtIqd: usdt.iqd > 0 ? usdt.iqd : 1310,
                stale: market.stale,
              }}
            />
          </div>
        </section>

        <section id="platform" className="sectionBlock">
          <div className="shell">
            <div className="sectionTitle">
              <span>{ar ? "ما هي Gulf Gate؟" : "What is Gulf Gate?"}</span>
              <h2>{ar ? "منصة لإدارة طلبات الأصول الرقمية" : "A platform for managing digital-asset requests"}</h2>
              <p>
                {ar
                  ? "تساعدك Gulf Gate على إنشاء ومتابعة طلبات شراء وبيع USDT وP2P المُدار، مع KYC وإثباتات الدفع والدعم — والطلبات حالياً إدارية وتجريبية فقط."
                  : "Gulf Gate helps you create and track USDT buy/sell and managed P2P requests, with KYC, payment proofs and support — currently for administrative demo review only."}
              </p>
            </div>
            <div className="featureGrid">
              {services.map(([Icon, title, text]) => {
                const ServiceIcon = Icon as typeof WalletCards;
                return (
                  <article className="featureCard" key={String(title)}>
                    <div className="featureIcon"><ServiceIcon /></div>
                    <h3>{String(title)}</h3>
                    <p>{String(text)}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="sectionBlock stepsSection">
          <div className="shell">
            <div className="sectionTitle centered">
              <span>{ar ? "كيف تعمل؟" : "How it works"}</span>
              <h2>{ar ? "مسار واضح من الحساب إلى المتابعة" : "A clear path from account to follow-up"}</h2>
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
            <ol className="plainSteps">
              {(ar
                ? ["إنشاء الحساب", "إكمال الملف", "إكمال KYC", "إنشاء الطلب", "مراجعة الطلب", "متابعة الحالة", "استلام الإشعارات"]
                : ["Create account", "Complete profile", "Complete KYC", "Create request", "Request review", "Track status", "Receive notifications"]
              ).map((item, index) => <li key={item}><b>{index + 1}.</b> {item}</li>)}
            </ol>
          </div>
        </section>

        <section id="payments" className="sectionBlock darkPanel">
          <div className="shell securityGrid">
            <div>
              <span className="sectionKicker">{ar ? "طرق الدفع" : "Payment methods"}</span>
              <h2>{ar ? "طرق الدفع المخطط دعمها" : "Planned payment methods"}</h2>
              <p>{ar ? "نعرض الطرق النشطة للإعداد والتجربة فقط. لا تُطلب تحويلات حقيقية في هذه المرحلة." : "Active methods are shown for setup and testing only. Real transfers are not requested at this stage."}</p>
            </div>
            <div className="chipGrid">
              {paymentMethods.map((method) => <span className="infoChip" key={method.code}><CreditCard size={16} />{method.name}</span>)}
            </div>
          </div>
        </section>

        <section id="networks" className="sectionBlock">
          <div className="shell">
            <div className="sectionTitle">
              <span>{ar ? "الشبكات" : "Networks"}</span>
              <h2>{ar ? "TRC20 و ERC20" : "TRC20 and ERC20"}</h2>
              <p>{ar ? "يجب أن تطابق شبكة الطلب عنوان المحفظة المحدد. أي اختلاف قد يؤخر المراجعة." : "The request network must match the selected wallet address. Any mismatch can delay review."}</p>
            </div>
            <div className="gateGrid">
              <div className="gate"><span>01</span><div><Network /><h3>TRC20</h3><p>{ar ? "عناوين تبدأ بـ T بطول 34 حرفاً." : "Addresses start with T and are 34 characters."}</p></div></div>
              <div className="gate"><span>02</span><div><Network /><h3>ERC20</h3><p>{ar ? "عناوين تبدأ بـ 0x بطول 42 حرفاً." : "Addresses start with 0x and are 42 characters."}</p></div></div>
            </div>
          </div>
        </section>

        <section id="security" className="sectionBlock darkPanel">
          <div className="shell securityGrid">
            <div>
              <span className="sectionKicker">{ar ? "الأمان والخصوصية" : "Security & privacy"}</span>
              <h2>{ar ? "حماية عملية بلغة مفهومة" : "Practical protection in plain language"}</h2>
              <p>{ar ? "وصول محدود حسب الصلاحية، ملفات خاصة، سجل مراجعة، وحماية الحساب. التفاصيل التقنية متاحة في صفحة الأمان والامتثال." : "Access is limited by role, files stay private, reviews are logged, and accounts are protected. Technical detail lives on the security & compliance page."}</p>
              <Link className="secondaryButton inverted" href={`/${locale}/security-compliance`}>
                {ar ? "تفاصيل الأمان والامتثال" : "Security & compliance details"}
                <Arrow />
              </Link>
            </div>
            <div className="securityStack">
              {[
                [LockKeyhole, ar ? "جلسات آمنة" : "Secure sessions", ar ? "حماية الدخول" : "Sign-in protection"],
                [ShieldCheck, ar ? "مستندات خاصة" : "Private documents", ar ? "وصول محدود" : "Limited access"],
                [Workflow, ar ? "سجل مراجعة" : "Review trail", ar ? "قابل للمتابعة" : "Traceable"],
                [BadgeCheck, ar ? "بدون مفاتيح محافظ" : "No wallet keys stored", ar ? "لا حفظ للمفاتيح" : "Keys never stored"],
              ].map(([Icon, title, tag]) => {
                const SecurityIcon = Icon as typeof LockKeyhole;
                return (
                  <div key={String(title)}>
                    <SecurityIcon />
                    <span><b>{String(title)}</b><small>{String(tag)}</small></span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="faq" className="sectionBlock faqSection">
          <div className="shell faqGrid">
            <div className="sectionTitle">
              <span>{ar ? "الأسئلة الشائعة" : "FAQ"}</span>
              <h2>{ar ? "إجابات مباشرة" : "Direct answers"}</h2>
            </div>
            <div className="faqList">
              {(ar
                ? [
                    ["هل الخدمة مرخصة؟", "لا تدّعي Gulf Gate امتلاك ترخيص لخدمات الأصول الافتراضية حالياً. تبقى الخدمة في وضع ما قبل الإطلاق."],
                    ["هل يمكن إرسال أموال الآن؟", "لا. لن يُطلب منك إرسال أي أموال خلال مرحلة ما قبل الإطلاق."],
                    ["هل الأسعار ملزمة؟", "لا. الأسعار المعروضة استرشادية فقط وليست عرض شراء أو بيع ملزماً."],
                    ["كيف يتم KYC؟", "تكمل بياناتك وترفع الوثائق المطلوبة، ثم تُراجع يدوياً داخل المنصة."],
                    ["كيف تُحفظ الوثائق؟", "تُحفظ في مساحة خاصة بوصول محدود عبر صلاحيات الحساب، وروابط مؤقتة عند الحاجة."],
                    ["ما هي الشبكات؟", "حالياً TRC20 وERC20، ويجب أن تطابق شبكة الطلب عنوان المحفظة."],
                    ["كيف أفتح تذكرة؟", "من لوحة العميل → الدعم، اختر الفئة واكتب الموضوع والرسالة."],
                    ["كيف أحذف حسابي؟", "من الأمان يمكنك طلب حذف الحساب ليراجعه الفريق وفق المتطلبات القانونية."],
                    ["ماذا يحدث عند رفض الوثيقة؟", "تصلك حالة واضحة وسبب مناسب للعميل، ويمكنك إعادة الرفع عند الحاجة."],
                    ["كيف أعرف حالة الطلب؟", "من سجل الطلبات والإشعارات داخل لوحة العميل."],
                  ]
                : [
                    ["Is the service licensed?", "Gulf Gate does not claim to hold a virtual-asset licence today. The service remains pre-launch."],
                    ["Can I send funds now?", "No. You will not be asked to send funds during pre-launch."],
                    ["Are prices binding?", "No. Shown prices are indicative only and not a binding buy or sell offer."],
                    ["How does KYC work?", "Complete your details, upload required documents, then the file is reviewed manually."],
                    ["How are documents stored?", "In private storage with account-based access limits and short-lived links when needed."],
                    ["Which networks?", "TRC20 and ERC20 for now, and the request network must match the wallet address."],
                    ["How do I open a ticket?", "From the client dashboard → Support, choose a category and submit your message."],
                    ["How do I delete my account?", "From Security you can request deletion for staff review under legal retention rules."],
                    ["What if a document is rejected?", "You receive a clear customer-facing reason and can resubmit when needed."],
                    ["How do I know my request status?", "From Orders and Notifications in the client dashboard."],
                  ]
              ).map(([q, a], index) => (
                <details key={q} open={index === 0}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="sectionBlock">
          <div className="shell">
            <div className="sectionTitle">
              <span>{ar ? "التواصل والثقة" : "Contact & trust"}</span>
              <h2>{ar ? "قنوات واضحة عند توفرها" : "Clear channels when configured"}</h2>
            </div>
            <div className="contactGrid">
              {company && <article><Building2 /><span>{ar ? "الاسم القانوني" : "Legal name"}</span><strong>{company}</strong></article>}
              {supportEmail && <article><Mail /><span>{ar ? "بريد الدعم" : "Support email"}</span><a href={`mailto:${supportEmail}`}>{supportEmail}</a></article>}
              {whatsapp && <article><Phone /><span>WhatsApp</span><a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} rel="noreferrer" target="_blank">{whatsapp}</a></article>}
              {hours && <article><LifeBuoy /><span>{ar ? "ساعات العمل" : "Working hours"}</span><strong>{hours}</strong></article>}
              {address && <article><Building2 /><span>{ar ? "العنوان" : "Address"}</span><strong>{address}</strong></article>}
              {license && <article><BadgeCheck /><span>{ar ? "رقم الرخصة" : "Trade licence"}</span><strong>{license}</strong></article>}
              {!company && !supportEmail && !whatsapp && !hours && !address && !license && (
                <p className="formNotice">{ar ? "بيانات التواصل تُعرض هنا بعد إعدادها في بيئة التشغيل." : "Contact details appear here once configured in the environment."}</p>
              )}
            </div>
            <div className="headingActions" style={{ marginTop: 18 }}>
              <Link href={`/${locale}/legal/privacy`}>{ar ? "الخصوصية" : "Privacy"}</Link>
              <Link href={`/${locale}/legal/terms`}>{ar ? "الشروط" : "Terms"}</Link>
              <Link href={`/${locale}/legal/risk`}>{ar ? "المخاطر" : "Risk"}</Link>
              <Link href={`/${locale}/login?next=/${locale}/dashboard/support`}>{ar ? "الشكاوى / الدعم" : "Complaints / support"}</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="mainFooter">
        <div className="shell footerGrid">
          <div>
            <Logo locale={locale} />
            <p>{ar ? "منصة لإدارة طلبات الأصول الرقمية — قيد التجهيز قبل الإطلاق." : "Digital-asset request management platform — being prepared for launch."}</p>
          </div>
          <div>
            <h3>{ar ? "المنصة" : "Platform"}</h3>
            <a href="#platform">{ar ? "الخدمات" : "Services"}</a>
            <a href="#how-it-works">{ar ? "كيف تعمل" : "How it works"}</a>
            <Link href={`/${locale}/security-compliance`}>{ar ? "الأمان" : "Security"}</Link>
          </div>
          <div>
            <h3>{ar ? "قانوني" : "Legal"}</h3>
            <Link href={`/${locale}/legal/terms`}>{ar ? "الشروط" : "Terms"}</Link>
            <Link href={`/${locale}/legal/privacy`}>{ar ? "الخصوصية" : "Privacy"}</Link>
            <Link href={`/${locale}/legal/risk`}>{ar ? "المخاطر" : "Risk"}</Link>
          </div>
          <div className="footerLock">
            <LockKeyhole />
            <span>
              <b>{ar ? "حالة الخدمة: تجهيز" : "Service state: preparing"}</b>
              <small>{ar ? "لا معاملات مالية حقيقية" : "No real financial transactions"}</small>
            </span>
          </div>
        </div>
        <div className="shell footerBottom">
          <span>© 2026 Gulf Gate</span>
          <Link href={locale === "ar" ? "/en" : "/ar"}>{locale === "ar" ? "English" : "العربية"}</Link>
          <span>{ar ? "معلومات عامة فقط — ليست عرضاً أو توصية" : "General information only — not an offer or recommendation"}</span>
        </div>
      </footer>
    </>
  );
}
