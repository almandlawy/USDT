import { getSiteOrigin, seoCopy, type SiteLocale } from "@/lib/site";

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function SeoJsonLd({ locale, nonce }: { locale: SiteLocale; nonce?: string }) {
  const origin = getSiteOrigin();
  const copy = seoCopy[locale];
  const ar = locale === "ar";
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: "Gulf Gate",
        url: `${origin}/${locale}`,
        logo: `${origin}/favicon.ico`,
        description: copy.description,
        areaServed: { "@type": "Country", name: "Iraq" },
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: "Gulf Gate",
        url: origin,
        inLanguage: ["ar-IQ", "en-IQ"],
        publisher: { "@id": `${origin}/#organization` },
      },
      {
        "@type": "Service",
        "@id": `${origin}/${locale}#service`,
        name: copy.shortTitle,
        description: copy.description,
        serviceType: ar ? "إدارة طلبات الأصول الرقمية في وضع ما قبل الإطلاق" : "Pre-launch digital asset request management",
        areaServed: { "@type": "Country", name: "Iraq" },
        provider: { "@id": `${origin}/#organization` },
        termsOfService: `${origin}/${locale}/legal/terms`,
      },
      {
        "@type": "FAQPage",
        "@id": `${origin}/${locale}#faq`,
        mainEntity: (ar
          ? [
              ["هل الخدمة مرخصة؟", "لا تدّعي Gulf Gate امتلاك ترخيص لخدمات الأصول الافتراضية حالياً. تبقى الخدمة في وضع ما قبل الإطلاق."],
              ["هل يمكن إرسال أموال الآن؟", "لا. لن يُطلب منك إرسال أي أموال خلال مرحلة ما قبل الإطلاق."],
              ["كيف تُحفظ الوثائق؟", "تُحفظ في مساحة خاصة بوصول محدود عبر صلاحيات الحساب، وروابط مؤقتة عند الحاجة."],
            ]
          : [
              ["Is the service licensed?", "Gulf Gate does not claim to hold a virtual-asset licence today. The service remains pre-launch."],
              ["Can I send funds now?", "No. You will not be asked to send funds during pre-launch."],
              ["How are documents stored?", "In private storage with account-based access limits and short-lived links when needed."],
            ]
        ).map(([name, text]) => ({
          "@type": "Question",
          name,
          acceptedAnswer: { "@type": "Answer", text },
        })),
      },
    ],
  };
  return <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(graph) }} />;
}
