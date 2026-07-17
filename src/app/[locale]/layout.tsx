import { notFound } from "next/navigation";
import { LocaleShell } from "@/components/ui/locale-shell";
import { isLocale } from "@/lib/i18n/dictionaries";
import type { Metadata } from "next";
import { getSiteOrigin, seoCopy } from "@/lib/site";

export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{
  const {locale}=await params;
  const selected=locale==="en"?"en":"ar";
  const copy=seoCopy[selected];
  const origin=getSiteOrigin();
  const canonical=`${origin}/${selected}`;
  return {
    title:{absolute:copy.title},
    description:copy.description,
    alternates:{
      canonical,
      languages:{"ar-IQ":`${origin}/ar`,"en-IQ":`${origin}/en`,"x-default":`${origin}/ar`},
    },
    openGraph:{
      title:copy.title,
      description:copy.description,
      url:canonical,
      siteName:"Gulf Gate",
      type:"website",
      locale:selected==="en"?"en_IQ":"ar_IQ",
      alternateLocale:selected==="en"?["ar_IQ"]:["en_IQ"],
      images:[{url:`${origin}/og/gulf-gate-cover.png`,width:1200,height:630,alt:copy.shortTitle}],
    },
    twitter:{card:"summary_large_image",title:copy.title,description:copy.description,images:[`${origin}/og/gulf-gate-cover.png`]},
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LocaleShell locale={locale}>{children}</LocaleShell>;
}
