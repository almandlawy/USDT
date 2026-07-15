import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { PrelaunchBanner } from "@/components/ui/prelaunch-banner";
import { isLocale } from "@/lib/i18n/dictionaries";
import type { Metadata } from "next";
import { getSiteOrigin, seoCopy } from "@/lib/site";

const content={terms:{ar:{title:"شروط الاستخدام",body:["Gulf Gate منصة لإدارة الطلبات في وضع ما قبل الإطلاق. لا يتم قبول إيداعات أو مدفوعات أو تنفيذ تداول أو تحويل أو إطلاق أصول رقمية.","يجوز للمستخدم إنشاء حساب وإكمال KYC وإنشاء طلب تجريبي ورفع إثبات تجريبي للمراجعة الداخلية فقط.","يجب أن تكون البيانات والوثائق المقدمة صحيحة وحديثة، ويجوز طلب إعادة التقديم أو معلومات إضافية."]},en:{title:"Terms of use",body:["Gulf Gate is a request-management platform in pre-launch. It does not accept deposits or payments and does not execute trades, transfers or digital-asset releases.","Users may create an account, complete KYC, create demo requests and upload demo evidence for internal review only.","Submitted information and documents must be accurate and current. Resubmission or additional information may be requested."]}},privacy:{ar:{title:"سياسة الخصوصية",body:["تُحفظ وثائق KYC وإثباتات الدفع في حاويات خاصة محمية بسياسات RLS.","يقتصر الوصول على صاحب الحساب والموظفين المخولين حسب الدور، وتستخدم روابط موقعة قصيرة الصلاحية عند عرض الملفات.","تُسجل الأحداث الحساسة في سجل تدقيق، وتطبق مدد الاحتفاظ والحذف وفق السياسة القانونية المعتمدة قبل الإطلاق."]},en:{title:"Privacy policy",body:["KYC documents and payment evidence are stored in private buckets protected by RLS.","Access is limited to the account owner and role-authorized staff. Short-lived signed URLs are used to view files.","Sensitive events are audit logged. Retention and deletion periods must follow the legal policy approved before launch."]}},risk:{ar:{title:"إفصاح المخاطر والتنظيم",body:["لا تدّعي Gulf Gate امتلاك ترخيص لخدمات الأصول الافتراضية حالياً.","الأسعار والمعلومات المعروضة استرشادية وتجريبية وليست عرضاً أو توصية أو ضماناً للتنفيذ.","LIVE_TRADING=false افتراضياً، ولا يمكن تفعيل التنفيذ إلا بعد موافقات قانونية وتقنية موثقة وقرار Super Admin بجلسة 2FA."]},en:{title:"Risk and regulatory disclosure",body:["Gulf Gate does not currently claim to hold a virtual-asset services licence.","Displayed prices and information are indicative and demonstrational, not an offer, recommendation or execution guarantee.","LIVE_TRADING=false by default. Execution may only be activated after documented legal and technical approvals and a Super Admin decision in a 2FA session."]}}} as const;

export function generateStaticParams(){return ["ar","en"].flatMap(locale=>["terms","privacy","risk"].map(document=>({locale,document})));}

export async function generateMetadata({params}:{params:Promise<{locale:string;document:string}>}):Promise<Metadata>{
  const {locale:raw,document}=await params;
  if(!isLocale(raw)||!(document in content))return {};
  const locale=raw;
  const origin=getSiteOrigin();
  const page=content[document as keyof typeof content][locale];
  const suffix=`/legal/${document}`;
  return {
    title:page.title,
    description:seoCopy[locale].legalDescription,
    alternates:{canonical:`${origin}/${locale}${suffix}`,languages:{"ar-IQ":`${origin}/ar${suffix}`,"en-IQ":`${origin}/en${suffix}`,"x-default":`${origin}/ar${suffix}`}},
    openGraph:{title:`${page.title} | Gulf Gate`,description:seoCopy[locale].legalDescription,url:`${origin}/${locale}${suffix}`,type:"article",locale:locale==="ar"?"ar_IQ":"en_IQ"},
  };
}

export default async function LegalPage({params}:{params:Promise<{locale:string;document:string}>}){const {locale:raw,document}=await params;if(!isLocale(raw)||!(document in content))notFound();const locale=raw;const ar=locale==="ar";const page=content[document as keyof typeof content][locale];const Arrow=ar?ArrowRight:ArrowLeft;return <div className="legalPage"><PrelaunchBanner locale={locale}/><header className="legalHeader shell"><Logo locale={locale}/><Link className="secondaryButton" href={`/${locale}`}><Arrow/>{ar?"العودة للرئيسية":"Back home"}</Link></header><main className="legalDocument shell"><span>LEGAL / VERSION 2026-07-15</span><h1>{page.title}</h1><div className="legalLock"><LockKeyhole/><p>{ar?"هذه الصفحة جزء من إفصاحات وضع ما قبل الإطلاق ولا تمثل ادعاءً بالترخيص.":"This page is part of the pre-launch disclosures and does not represent a licensing claim."}</p></div>{page.body.map(paragraph=><p key={paragraph}>{paragraph}</p>)}</main></div>}
