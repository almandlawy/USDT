import Link from "next/link";
import { headers } from "next/headers";
import {
  ArrowUpLeft,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CircleCheck,
  CreditCard,
  FileCheck2,
  Globe2,
  Handshake,
  Landmark,
  LifeBuoy,
  Link2,
  LockKeyhole,
  Mail,
  Network,
  Phone,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UserCheck,
  WalletCards,
  Workflow,
} from "lucide-react";
import { notFound } from "next/navigation";
import { MarketingHeader } from "@/components/marketing/header";
import { ExchangeDesk } from "@/components/marketing/exchange-desk";
import { MarketTicker } from "@/components/marketing/market-ticker";
import { SeoJsonLd } from "@/components/marketing/seo-json-ld";
import { CountryPaymentSelector } from "@/components/marketing/country-payment-selector";
import { PortalArtwork } from "@/components/marketing/portal-artwork";
import { Logo } from "@/components/ui/logo";
import { PrelaunchBanner } from "@/components/ui/prelaunch-banner";
import { StatusBadge } from "@/components/ui/status-badge";
import { getDictionary, isLocale } from "@/lib/i18n/dictionaries";
import { getMarketSnapshot } from "@/lib/market-data";

function contactValue(key: string) {
  const value = process.env[key]?.trim();
  return value || null;
}

function envEnabled(key: string) {
  return ["1", "true", "enabled", "yes"].includes((process.env[key] || "").trim().toLowerCase());
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

  const company = contactValue("NEXT_PUBLIC_LEGAL_NAME") || contactValue("NEXT_PUBLIC_COMPANY_NAME");
  const supportEmail = contactValue("NEXT_PUBLIC_SUPPORT_EMAIL");
  const whatsapp = contactValue("NEXT_PUBLIC_WHATSAPP_NUMBER");
  const address = contactValue("NEXT_PUBLIC_COMPANY_ADDRESS");
  const hours = contactValue("NEXT_PUBLIC_WORKING_HOURS");
  const tradeLicense = contactValue("NEXT_PUBLIC_TRADE_LICENSE_NUMBER");
  const varaLicense = contactValue("NEXT_PUBLIC_VARA_LICENSE_NUMBER");
  const legalVerified = envEnabled("COMPANY_LEGAL_DETAILS_VERIFIED");

  const providers = {
    stripe: envEnabled("STRIPE_ENABLED") && envEnabled("STRIPE_CRYPTO_APPROVED"),
    fib: envEnabled("FIB_ENABLED"),
    superqi: envEnabled("SUPERQI_ENABLED"),
    zainCash: envEnabled("ZAINCASH_ENABLED"),
    eandMoney: envEnabled("EAND_MONEY_ENABLED"),
    duPay: envEnabled("DUPAY_ENABLED"),
    bankTransfer: envEnabled("BANK_TRANSFER_ENABLED"),
  };

  const services = ar
    ? [
        [WalletCards, "طلبات شراء USDT", "طلب منظم بالمبلغ والعملات والشبكة وعنوان المحفظة مع رقم متابعة واضح."],
        [CreditCard, "طلبات بيع USDT", "مسار بيع موثق مع مراجعة الدفع والحالة والتنبيهات من لوحة واحدة."],
        [Link2, "رابط عرض آمن", "إنشاء رابط محدد المبلغ والصلاحية يفتحه العميل لإكمال بياناته ومحفظته."],
        [Landmark, "دفع حسب الدولة", "العراق والإمارات وباقي الدول تظهر لها المسارات المسموحة فقط."],
        [UserCheck, "KYC ومراجعة", "ملفات خاصة، أسباب واضحة للعميل، وملاحظات داخلية منفصلة للفريق."],
        [LifeBuoy, "دعم ومتابعة", "تذاكر، إشعارات، سجل حالة، ومراجع طلبات قابلة للتتبع."],
      ]
    : [
        [WalletCards, "USDT buy requests", "Structured requests with amount, currency, network, wallet address and a clear reference."],
        [CreditCard, "USDT sell requests", "A documented sell workflow with payment review, status tracking and notifications."],
        [Link2, "Secure quote links", "Create amount-specific, expiring links that customers complete with their wallet details."],
        [Landmark, "Country-based payments", "Iraq, UAE and global customers only see payment routes allowed for their location."],
        [UserCheck, "KYC and review", "Private files, clear customer reasons and separate internal review notes."],
        [LifeBuoy, "Support and tracking", "Tickets, notifications, status history and traceable request references."],
      ];

  const steps = ar
    ? [
        ["01", "اختر الدولة والمبلغ", "حدد دولة الدفع والعملة وكمية USDT أو المبلغ النقدي."],
        ["02", "ثبّت العرض", "يُنشئ النظام مرجعاً وسعراً استرشادياً بمدة صلاحية واضحة."],
        ["03", "أكمل المحفظة والدفع", "أدخل عنوان المحفظة مرتين واختر المسار المتاح لدولتك."],
        ["04", "تابع المراجعة", "راجع حالة الدفع وKYC والتسليم من حسابك أو رابط المتابعة."],
      ]
    : [
        ["01", "Choose country and amount", "Select the payment country, currency and either fiat or USDT amount."],
        ["02", "Lock the quote", "The platform creates a reference and an indicative quote with a clear expiry."],
        ["03", "Add wallet and payment", "Confirm the wallet address twice and choose a route available in your country."],
        ["04", "Track the review", "Follow payment, KYC and fulfillment status from your account or tracking link."],
      ];

  return (
    <>
      <SeoJsonLd locale={locale} nonce={nonce} />
      <a className="skipLink" href="#main-content">{ar ? "انتقل إلى المحتوى" : "Skip to content"}</a>
      <PrelaunchBanner locale={locale} />
      <MarketingHeader locale={locale} dict={dict} />

      <main id="main-content">
        <section className="heroSection luxuryHero">
          <div className="shell heroGrid architecturalHeroGrid">
            <div className="heroCopy">
              <div className="heroBrand"><Logo locale={locale} variant="light" /></div>
              <StatusBadge tone="warning">{dict.hero.badge}</StatusBadge>
              <p className="eyebrow">{ar ? "GULF GATE · DIGITAL ASSET OPERATIONS" : "GULF GATE · DIGITAL ASSET OPERATIONS"}</p>
              <h1>
                {ar ? "بوابتك لإدارة" : "The gateway to"}
                <span>{ar ? "طلبات الأصول الرقمية" : "digital-asset operations"}</span>
              </h1>
              <p>
                {ar
                  ? "اختر الدولة ووسيلة الدفع، احصل على سعر استرشادي، وأنشئ طلب شراء أو بيع أو رابط عرض آمن من تجربة موحدة وواضحة."
                  : "Choose the country and payment route, receive an indicative quote, and create a buy, sell or secure-link request from one refined workspace."}
              </p>
              <div className="heroActions">
                <Link className="primaryButton" href={`/${locale}/register`}>
                  {ar ? "ابدأ طلباً" : "Start a request"}<Arrow size={18} />
                </Link>
                <Link className="secondaryButton" href={`/${locale}/login`}>{dict.nav.login}</Link>
                <a className="textButton" href="#country-payments">{ar ? "طرق الدفع" : "Payment routes"}</a>
              </div>
              <div className="trustRow">
                <span><CircleCheck />{ar ? "دفع حسب الدولة" : "Country-aware payments"}</span>
                <span><CircleCheck />{ar ? "مرجع منفصل لكل طلب" : "Unique order references"}</span>
                <span><CircleCheck />{ar ? "مراجعة بشرية قبل التسليم" : "Human review before fulfillment"}</span>
              </div>
            </div>
            <PortalArtwork locale={locale} />
          </div>
        </section>

        <MarketTicker locale={locale} initial={market} />

        <section id="quote" className="sectionBlock quoteSection">
          <div className="shell quoteLayout">
            <div className="sectionTitle quoteIntro">
              <span>{ar ? "سعر استرشادي" : "Indicative quote"}</span>
              <h2>{ar ? "اعرف القيمة قبل إنشاء الطلب" : "Understand the value before creating a request"}</h2>
              <p>
                {ar
                  ? "الحاسبة تستخدم بيانات السوق المتاحة وتوضح حالة السعر. المبلغ النهائي وطريقة الدفع يثبتان داخل الطلب فقط."
                  : "The calculator uses available market data and clearly labels the rate status. Final amount and payment route are fixed inside the request."}
              </p>
              <div className="editorialRule" />
              <ul className="editorialList">
                <li><CheckCircle2 />{ar ? "لا رسوم مخفية داخل المعاينة" : "No hidden fee inside the preview"}</li>
                <li><CheckCircle2 />{ar ? "الدولة تحدد العملة والمسارات" : "Country determines currency and routes"}</li>
                <li><CheckCircle2 />{ar ? "الخادم يعيد التحقق من المبلغ" : "The server revalidates the amount"}</li>
              </ul>
            </div>
            <ExchangeDesk
              locale={locale}
              registerHref={`/${locale}/register`}
              rates={{
                usdtUsd: usdt?.usd && usdt.usd > 0 ? usdt.usd : 1,
                usdtAed: usdt?.aed && usdt.aed > 0 ? usdt.aed : 3.6725,
                usdtIqd: usdt?.iqd && usdt.iqd > 0 ? usdt.iqd : 0,
                stale: market.status === "fallback" || market.stale,
                status: market.status,
              }}
            />
          </div>
        </section>

        <section id="country-payments" className="sectionBlock countrySection">
          <div className="shell">
            <div className="sectionTitle splitHeading">
              <div>
                <span>{ar ? "المسارات حسب الدولة" : "Country-based routes"}</span>
                <h2>{ar ? "كل عميل يرى الخيارات المناسبة له فقط" : "Each customer only sees the routes relevant to them"}</h2>
              </div>
              <p>
                {ar
                  ? "لا نعرض أرقام حسابات أو معلومات تاجر عامة. بعد إنشاء طلب صالح تظهر تعليمات الوسيلة المختارة فقط."
                  : "We do not publish account numbers or merchant details. Only the selected route is revealed after a valid order is created."}
              </p>
            </div>
            <CountryPaymentSelector locale={locale} providers={providers} />
          </div>
        </section>

        <section id="platform" className="sectionBlock servicesSection">
          <div className="shell">
            <div className="sectionTitle centered">
              <span>{ar ? "منصة تشغيل متكاملة" : "Integrated operations platform"}</span>
              <h2>{ar ? "كل ما يحتاجه الطلب في مكان واحد" : "Everything the request needs in one place"}</h2>
              <p>{ar ? "تجربة موحدة للعميل والفريق، من السعر والرابط إلى التحقق والدفع والمتابعة." : "A unified customer and staff experience, from quote and link to verification, payment and tracking."}</p>
            </div>
            <div className="featureGrid luxuryFeatureGrid">
              {services.map(([Icon, title, text], index) => {
                const ServiceIcon = Icon as typeof WalletCards;
                return (
                  <article className="featureCard" key={String(title)}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div className="featureIcon"><ServiceIcon /></div>
                    <h3>{String(title)}</h3>
                    <p>{String(text)}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="secure-links" className="sectionBlock secureLinkSection">
          <div className="shell secureLinkGrid">
            <div className="secureLinkVisual" aria-hidden="true">
              <div className="quoteTicket">
                <div className="quoteTicketTop"><Logo locale={locale} variant="light" /><span>GG-QUOTE</span></div>
                <div className="quoteTicketAmount"><small>{ar ? "المبلغ" : "Amount"}</small><strong>25,000 AED</strong></div>
                <div className="quoteTicketRows">
                  <span><b>USDT</b><em>6,806.72</em></span>
                  <span><b>{ar ? "الشبكة" : "Network"}</b><em>TRC20</em></span>
                  <span><b>{ar ? "الصلاحية" : "Expires"}</b><em>05:00</em></span>
                </div>
                <div className="quoteTicketCode">gulf-gate-platform.vercel.app/q/••••••••</div>
              </div>
            </div>
            <div className="sectionTitle">
              <span>{ar ? "Gulf Gate Secure Quote Link" : "Gulf Gate Secure Quote Link"}</span>
              <h2>{ar ? "أنشئ رابط شراء بالمبلغ والشبكة والصلاحية" : "Create a purchase link with amount, network and expiry"}</h2>
              <p>
                {ar
                  ? "يرى العميل تفاصيل العرض، يثبت عنوان محفظته مرتين، يختار طريقة الدفع المتاحة، ويرفع الإثبات عند الحاجة دون كشف بيانات داخلية."
                  : "The customer reviews the quote, confirms the wallet address twice, selects an available route and uploads proof when required without exposing internal data."}
              </p>
              <div className="secureLinkPoints">
                <span><Link2 />{ar ? "رمز عشوائي غير متسلسل" : "Random non-sequential token"}</span>
                <span><LockKeyhole />{ar ? "استخدام واحد وإلغاء فوري" : "Single use and instant revocation"}</span>
                <span><ReceiptText />{ar ? "رقم متابعة وإثبات دفع" : "Tracking reference and payment proof"}</span>
              </div>
              <Link className="primaryButton" href={`/${locale}/login?next=/${locale}/dashboard/buy`}>
                {ar ? "إنشاء طلب" : "Create a request"}<Arrow size={18} />
              </Link>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="sectionBlock processSection">
          <div className="shell">
            <div className="sectionTitle centered">
              <span>{ar ? "كيف تعمل" : "How it works"}</span>
              <h2>{ar ? "أربع مراحل واضحة من السعر إلى المتابعة" : "Four clear stages from quote to tracking"}</h2>
            </div>
            <div className="processGrid">
              {steps.map(([number, title, text]) => (
                <article key={number}>
                  <span>{number}</span>
                  <div className="processLine" />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="networks" className="sectionBlock networkSection">
          <div className="shell networkGrid">
            <div className="sectionTitle">
              <span>{ar ? "الشبكات" : "Networks"}</span>
              <h2>{ar ? "تحقق واضح قبل اعتماد عنوان المحفظة" : "Clear checks before a wallet address is accepted"}</h2>
              <p>{ar ? "تطابق الشبكة والعنوان إلزامي، وتغيير العنوان بعد الدفع يرسل الطلب إلى مراجعة إضافية." : "Network and address must match, and changing the address after payment triggers additional review."}</p>
            </div>
            <div className="networkCards">
              <article><span>01</span><Network /><h3>TRC20</h3><p>{ar ? "عنوان Tron يبدأ عادة بحرف T." : "Tron addresses normally begin with T."}</p></article>
              <article><span>02</span><Network /><h3>ERC20</h3><p>{ar ? "عنوان Ethereum يبدأ بـ 0x ويخضع لفحص الصيغة." : "Ethereum addresses begin with 0x and are format-checked."}</p></article>
              <article><span>03</span><ShieldCheck /><h3>{ar ? "تأكيد مزدوج" : "Double confirmation"}</h3><p>{ar ? "إدخال العنوان مرتين قبل حفظ الطلب." : "The address is entered twice before the request is stored."}</p></article>
            </div>
          </div>
        </section>

        <section id="security" className="sectionBlock darkPanel institutionalPanel">
          <div className="shell institutionalGrid">
            <div>
              <span className="sectionKicker">{ar ? "الأمان والتشغيل" : "Security and operations"}</span>
              <h2>{ar ? "بنية تشغيلية مصممة للوضوح والمراجعة" : "Operational infrastructure designed for clarity and review"}</h2>
              <p>{ar ? "الصلاحيات والوثائق والمدفوعات والحالات منفصلة، وكل إجراء حساس قابل للتدقيق." : "Roles, documents, payments and states are separated, and every sensitive action is traceable."}</p>
              <Link className="secondaryButton inverted" href={`/${locale}/security-compliance`}>
                {ar ? "تفاصيل الأمان والامتثال" : "Security and compliance details"}<Arrow />
              </Link>
            </div>
            <div className="institutionalCards">
              {[
                [LockKeyhole, ar ? "صلاحيات دقيقة" : "Granular roles", ar ? "وصول حسب المهمة" : "Task-based access"],
                [FileCheck2, ar ? "ملفات خاصة" : "Private files", ar ? "روابط مؤقتة" : "Short-lived links"],
                [Workflow, ar ? "سجل تدقيق" : "Audit trail", ar ? "أحداث قابلة للتتبع" : "Traceable events"],
                [ShieldCheck, ar ? "تسليم يدوي" : "Manual fulfillment", ar ? "مراجعة قبل الإرسال" : "Review before release"],
              ].map(([Icon, title, text]) => {
                const ItemIcon = Icon as typeof LockKeyhole;
                return <article key={String(title)}><ItemIcon /><div><h3>{String(title)}</h3><p>{String(text)}</p></div></article>;
              })}
            </div>
          </div>
        </section>

        <section id="faq" className="sectionBlock faqSection">
          <div className="shell faqGrid">
            <div className="sectionTitle">
              <span>{ar ? "الأسئلة الشائعة" : "FAQ"}</span>
              <h2>{ar ? "إجابات مباشرة قبل إنشاء الطلب" : "Direct answers before creating a request"}</h2>
              <p>{ar ? "المعلومات التشغيلية تظهر بحسب إعداد البيئة والدولة والمزود." : "Operational information appears according to environment, country and provider configuration."}</p>
            </div>
            <div className="faqList">
              {(ar
                ? [
                    ["متى تظهر تفاصيل الدفع؟", "بعد إنشاء طلب صالح واختيار وسيلة واحدة، تظهر تعليمات تلك الوسيلة فقط مع مرجع خاص."],
                    ["هل يظهر Stripe للعراق؟", "لا. العراق يعرض FIB وSuperQi وZain Cash والتحويل البنكي عند تفعيلها."],
                    ["كيف يعمل رابط العرض؟", "يحتوي مبلغاً وشبكة ومدة صلاحية ولا يكشف بيانات حساسة داخل عنوان الرابط."],
                    ["هل صفحة النجاح تؤكد الدفع؟", "لا. التأكيد يعتمد على Webhook صحيح أو مراجعة إثبات الدفع."],
                    ["هل يتم إرسال USDT تلقائياً؟", "لا. التسليم يبقى تحت مراجعة بشرية حتى تفعيل منظومة اعتماد منفصلة."],
                    ["كيف تُحفظ الوثائق؟", "في تخزين خاص مع صلاحيات وروابط مؤقتة، ولا تظهر ملاحظات الفريق الداخلية للعميل."],
                  ]
                : [
                    ["When are payment details shown?", "After a valid order is created and one route is selected, only that route's instructions appear with a unique reference."],
                    ["Does Stripe appear in Iraq?", "No. Iraq shows FIB, SuperQi, Zain Cash and bank transfer when configured."],
                    ["How does a quote link work?", "It contains an amount, network and expiry without placing sensitive data in the URL."],
                    ["Does the success page confirm payment?", "No. Confirmation depends on a valid webhook or reviewed payment proof."],
                    ["Is USDT sent automatically?", "No. Fulfillment remains under human review until a separate approval system is activated."],
                    ["How are documents stored?", "In private storage with role controls and short-lived links; internal notes are not exposed to customers."],
                  ]
              ).map(([question, answer], index) => (
                <details key={question} open={index === 0}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="sectionBlock contactSection">
          <div className="shell">
            <div className="sectionTitle centered">
              <span>{ar ? "هوية موثقة" : "Verified identity"}</span>
              <h2>{ar ? "بيانات الشركة تظهر بعد التحقق منها فقط" : "Company details appear only after verification"}</h2>
            </div>
            <div className="contactGrid">
              {legalVerified && company && <article><Building2 /><span>{ar ? "الاسم القانوني" : "Legal name"}</span><strong>{company}</strong></article>}
              {supportEmail && <article><Mail /><span>{ar ? "بريد الدعم" : "Support email"}</span><a href={`mailto:${supportEmail}`}>{supportEmail}</a></article>}
              {whatsapp && <article><Phone /><span>WhatsApp</span><a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} rel="noreferrer" target="_blank">{whatsapp}</a></article>}
              {hours && <article><LifeBuoy /><span>{ar ? "ساعات العمل" : "Working hours"}</span><strong>{hours}</strong></article>}
              {legalVerified && address && <article><Globe2 /><span>{ar ? "العنوان القانوني" : "Legal address"}</span><strong>{address}</strong></article>}
              {legalVerified && tradeLicense && <article><BadgeCheck /><span>{ar ? "الرخصة التجارية" : "Trade licence"}</span><strong>{tradeLicense}</strong></article>}
              {legalVerified && varaLicense && <article><ShieldCheck /><span>{ar ? "مرجع VARA" : "VARA reference"}</span><strong>{varaLicense}</strong></article>}
              {!supportEmail && !whatsapp && !hours && !(legalVerified && (company || address || tradeLicense || varaLicense)) && (
                <p className="formNotice">{ar ? "تظهر بيانات التواصل والبيانات القانونية بعد اعتمادها في إعدادات التشغيل." : "Contact and legal details appear after they are approved in the production configuration."}</p>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="mainFooter luxuryFooter">
        <div className="shell footerGrid">
          <div className="footerBrandBlock">
            <Logo locale={locale} />
            <p>{ar ? "بوابة تشغيل راقية لإدارة طلبات الأصول الرقمية والدفع والمتابعة." : "A refined operational gateway for digital-asset requests, payments and tracking."}</p>
          </div>
          <div>
            <h3>{ar ? "المنصة" : "Platform"}</h3>
            <a href="#quote">{ar ? "السعر" : "Quote"}</a>
            <a href="#country-payments">{ar ? "طرق الدفع" : "Payment routes"}</a>
            <a href="#secure-links">{ar ? "روابط العرض" : "Quote links"}</a>
          </div>
          <div>
            <h3>{ar ? "قانوني" : "Legal"}</h3>
            <Link href={`/${locale}/legal/terms`}>{ar ? "الشروط" : "Terms"}</Link>
            <Link href={`/${locale}/legal/privacy`}>{ar ? "الخصوصية" : "Privacy"}</Link>
            <Link href={`/${locale}/legal/risk`}>{ar ? "المخاطر" : "Risk"}</Link>
            <Link href={`/${locale}/legal/data-deletion`}>{ar ? "حذف البيانات" : "Data deletion"}</Link>
          </div>
          <div className="footerLock">
            <Sparkles />
            <span><b>GULF GATE</b><small>{ar ? "تشغيل دقيق. تجربة واضحة." : "Precise operations. Clear experience."}</small></span>
          </div>
        </div>
        <div className="shell footerBottom">
          <span>© 2026 Gulf Gate</span>
          <Link href={locale === "ar" ? "/en" : "/ar"}>{locale === "ar" ? "English" : "العربية"}</Link>
          <span>{ar ? "الأسعار استرشادية وحالة التشغيل تعتمد على الإعدادات المعتمدة." : "Rates are indicative and operational availability depends on approved configuration."}</span>
        </div>
      </footer>
    </>
  );
}
