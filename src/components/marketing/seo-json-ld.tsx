import { getSiteOrigin, seoCopy, type SiteLocale } from "@/lib/site";

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function SeoJsonLd({ locale, nonce }: { locale: SiteLocale; nonce?: string }) {
  const origin=getSiteOrigin();
  const copy=seoCopy[locale];
  const ar=locale==="ar";
  const graph={
    "@context":"https://schema.org",
    "@graph":[
      {
        "@type":"Organization",
        "@id":`${origin}/#organization`,
        name:"Gulf Gate",
        url:`${origin}/${locale}`,
        logo:`${origin}/favicon.ico`,
        description:copy.description,
        areaServed:{"@type":"Country",name:"Iraq"},
      },
      {
        "@type":"WebSite",
        "@id":`${origin}/#website`,
        name:"Gulf Gate",
        url:origin,
        inLanguage:["ar-IQ","en-IQ"],
        publisher:{"@id":`${origin}/#organization`},
      },
      {
        "@type":"Service",
        "@id":`${origin}/${locale}#service`,
        name:copy.shortTitle,
        description:copy.description,
        serviceType:ar?"إدارة طلبات الأصول الرقمية في وضع ما قبل الإطلاق":"Pre-launch digital asset request management",
        areaServed:{"@type":"Country",name:"Iraq"},
        provider:{"@id":`${origin}/#organization`},
        termsOfService:`${origin}/${locale}/legal/terms`,
      },
      {
        "@type":"FAQPage",
        "@id":`${origin}/${locale}#faq`,
        mainEntity:(ar?[
          ["هل Gulf Gate مرخصة؟","لا تدّعي Gulf Gate امتلاك ترخيص لخدمات الأصول الافتراضية حالياً. تبقى الخدمة في وضع ما قبل الإطلاق."],
          ["هل يمكن تنفيذ طلب حقيقي؟","لا. يمكن بناء الطلب ومراجعته فقط، بينما الإيداع والدفع والتحويل وإطلاق الأصل مقفول."],
          ["كيف تُحفظ الوثائق؟","في حاويات خاصة مع سياسات RLS وروابط وصول مؤقتة موقعة."],
        ]:[
          ["Is Gulf Gate licensed?","Gulf Gate does not claim to hold a virtual asset services licence. The service remains in pre-launch mode."],
          ["Can a real request be executed?","No. Requests can be prepared and reviewed, while deposits, payouts, transfers and asset release remain locked."],
          ["How are documents stored?","In private buckets protected by RLS and short-lived signed access links."],
        ]).map(([name,text])=>({"@type":"Question",name,acceptedAnswer:{"@type":"Answer",text}})),
      },
    ],
  };
  return <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJson(graph)}} />;
}

