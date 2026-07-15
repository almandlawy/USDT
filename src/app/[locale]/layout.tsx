import { notFound } from "next/navigation";
import { LocaleShell } from "@/components/ui/locale-shell";
import { isLocale } from "@/lib/i18n/dictionaries";
import type { Metadata } from "next";

export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{const {locale}=await params;const en=locale==="en";return {title:en?"Digital asset request management":"إدارة طلبات الأصول الرقمية",description:en?"Bilingual pre-launch customer, KYC and digital-asset request management platform.":"منصة ثنائية اللغة لإدارة العملاء وKYC وطلبات الأصول الرقمية في وضع ما قبل الإطلاق.",alternates:{canonical:`/${en?"en":"ar"}`,languages:{ar:"/ar",en:"/en"}},openGraph:{title:en?"Gulf Gate — Pre-launch platform":"Gulf Gate — منصة ما قبل الإطلاق",description:en?"No real deposits, payouts or digital-asset release.":"لا إيداعات أو مدفوعات أو إطلاق أصول رقمية حقيقية.",type:"website",locale:en?"en_US":"ar_IQ"}}}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LocaleShell locale={locale}>{children}</LocaleShell>;
}
